// Neteja de codis i preus, portada literalment de l'index.html original.

export function cleanCode(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.getUTCDate() + "." + (v.getUTCMonth() + 1);
  if (typeof v === "number") return String(parseFloat(v.toFixed(4)));
  return String(v).trim();
}

export function cleanPrice(v: unknown): { price: number; priceText: string | null } {
  if (typeof v === "number") return { price: Math.round(v * 100) / 100, priceText: null };
  if (typeof v === "string" && v.trim()) {
    const t = v.trim();
    const n = parseFloat(t.replace(",", "."));
    if (isFinite(n) && /^[\d.,\s€]+$/.test(t)) return { price: Math.round(n * 100) / 100, priceText: null };
    return { price: 0, priceText: t };
  }
  return { price: 0, priceText: null };
}
