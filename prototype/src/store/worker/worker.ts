// Point d'entrée du worker : le moteur branché sur postMessage.

/// <reference lib="webworker" />
import type { VersWorker } from "../protocole";
import { creerMoteur } from "./moteur";

const portee = self as unknown as DedicatedWorkerGlobalScope;
const moteur = creerMoteur((message, transfert) => portee.postMessage(message, transfert ?? []));
portee.onmessage = (e: MessageEvent<VersWorker>) => moteur.recevoir(e.data);
