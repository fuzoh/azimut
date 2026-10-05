// Accès CDP d'un run : bridage CPU de la page, mémoire par cible (page, worker).
// Le worker dédié est atteint par `Target.setAutoAttach` sur la session de la
// page, sans aplatissement : ses commandes passent par `Target.sendMessageToTarget`.

import type { BrowserContext, CDPSession, Page } from "playwright";

export interface Tas {
  /** Tas JS utilisé. */
  usedSize: number;
  totalSize: number;
  /** Stockage des ArrayBuffer (tableaux typés), hors `usedSize`. */
  backingStorageSize: number;
}

export interface MemoireCibles {
  page: Tas;
  worker: Tas | null;
}

export class CiblesCdp {
  private prochainId = 1;
  private readonly reponses = new Map<number, (m: { result?: unknown; error?: { message: string } }) => void>();
  private readonly workers: string[] = [];

  private constructor(readonly session: CDPSession) {
    session.on("Target.attachedToTarget", (e: { sessionId: string; targetInfo: { type: string } }) => {
      if (e.targetInfo.type === "worker") this.workers.push(e.sessionId);
    });
    session.on("Target.detachedFromTarget", (e: { sessionId: string }) => {
      const i = this.workers.indexOf(e.sessionId);
      if (i >= 0) this.workers.splice(i, 1);
    });
    session.on("Target.receivedMessageFromTarget", (e: { message: string }) => {
      const m = JSON.parse(e.message) as { id?: number; result?: unknown; error?: { message: string } };
      if (m.id !== undefined) {
        this.reponses.get(m.id)?.(m);
        this.reponses.delete(m.id);
      }
    });
  }

  static async ouvrir(context: BrowserContext, page: Page): Promise<CiblesCdp> {
    const c = new CiblesCdp(await context.newCDPSession(page));
    await c.session.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: false });
    return c;
  }

  /** Bridage CPU du thread principal de la page (`Emulation.setCPUThrottlingRate`). */
  async brider(taux: number): Promise<void> {
    await this.session.send("Emulation.setCPUThrottlingRate", { rate: taux });
  }

  /** Commande CDP envoyée au premier worker attaché ; rejette si aucun ou en erreur. */
  envoyerWorker<T>(method: string, params: object = {}): Promise<T> {
    const sessionId = this.workers[0];
    if (!sessionId) return Promise.reject(new Error("aucun worker attaché"));
    const id = this.prochainId++;
    return new Promise<T>((resolve, reject) => {
      this.reponses.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result as T)));
      void this.session.send("Target.sendMessageToTarget", { sessionId, message: JSON.stringify({ id, method, params }) });
    });
  }

  aUnWorker(): boolean {
    return this.workers.length > 0;
  }

  /** `HeapProfiler.collectGarbage` puis `Runtime.getHeapUsage`, par cible. */
  async memoire(): Promise<MemoireCibles> {
    await this.session.send("HeapProfiler.collectGarbage");
    const page = (await this.session.send("Runtime.getHeapUsage")) as Tas;
    let worker: Tas | null = null;
    if (this.aUnWorker()) {
      await this.envoyerWorker("HeapProfiler.collectGarbage");
      worker = await this.envoyerWorker<Tas>("Runtime.getHeapUsage");
    }
    const garder = (t: Tas): Tas => ({ usedSize: t.usedSize, totalSize: t.totalSize, backingStorageSize: t.backingStorageSize ?? 0 });
    return { page: garder(page), worker: worker && garder(worker) };
  }
}
