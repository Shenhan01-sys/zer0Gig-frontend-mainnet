/**
 * OG ↔ IDR display helper for the Indonesian-market UX.
 *
 * 0G is NOT IDR-pegged — the rate here is a DISPLAY-ONLY reference so
 * Indonesian users see familiar Rupiah figures next to OG amounts. Real
 * settlement happens in IDRX (regulated rupiah stablecoin) in V2; OG stays
 * the infrastructure token. Override the reference rate at deploy time via
 * NEXT_PUBLIC_OG_TO_IDR.
 */

// 1 OG ≈ Rp (reference). Placeholder until a live oracle/feed is wired —
// kept conservative and clearly labelled wherever it surfaces in the UI.
export const OG_TO_IDR = Number(process.env.NEXT_PUBLIC_OG_TO_IDR) || 50000;

export function ogToIdr(og: number): number {
  return og * OG_TO_IDR;
}

export function formatIdr(idr: number): string {
  if (!isFinite(idr)) return "Rp 0";
  return "Rp " + Math.round(idr).toLocaleString("id-ID");
}

export function formatOg(og: number, digits = 4): string {
  if (!isFinite(og)) return "0 OG";
  // Trim trailing zeros (and a dangling dot) but keep up to `digits`.
  const s = og.toFixed(digits).replace(/\.?0+$/, "");
  return `${s} OG`;
}

/** Parse the first numeric value out of a free-text hint like "0.05 – 0.1 OG". */
export function parseFirstNumber(s: string): number | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return isFinite(n) ? n : null;
}
