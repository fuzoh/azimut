// Affichage d'une valeur sur son barème (arrondi d'affichage, sans effet sur la valeur transmise).

import type { BaremeCompile } from "./compile";

export function formater(b: BaremeCompile, v: number): string {
  if (Number.isNaN(v)) return "—";
  if (b.type === "ordinal") {
    const rang = b.valeurs.indexOf(v);
    if (b.valeurs.length === 2 && b.min === 0 && b.max === 1) return v === 1 ? "OK" : "KO";
    return rang >= 0 ? String(v) : v.toFixed(2);
  }
  if (b.pourcentage) return `${(Math.round(v * 1000) / 10).toFixed(1).replace(".", ",")} %`;
  if (b.id === "(0–100 %)") return `${(Math.floor(v * 10 + 0.5 + 1e-9) / 10).toFixed(1).replace(".", ",")} %`;
  if (b.id.startsWith("pct") || b.id.includes("%")) return `${(Math.round(v * 100) / 100).toString().replace(".", ",")} %`;
  // Note 1–5 (A03) et (1–5) dérivé (G3) : arrondi d'affichage 0,01, demi vers le haut.
  return (Math.floor(v * 100 + 0.5 + 1e-9) / 100).toFixed(2).replace(".", ",");
}
