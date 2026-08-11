// Descompte com a text lliure ("10%", "-10%", "5", "5€"): amb "%" es tracta com
// a percentatge, sense "%" com a import fix. El signe s'ignora — un descompte
// sempre resta.
export function parseDiscount(raw: string): { percent: number } | { amount: number } | null {
  const s = raw.trim();
  if (!s) return null;
  const isPercent = s.includes("%");
  const cleaned = s.replace(/[%€\s]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n === 0) return null;
  const magnitude = Math.abs(n);
  return isPercent ? { percent: magnitude } : { amount: magnitude };
}

export function applyDiscountToAmount(amount: number, discount: string): number {
  const d = parseDiscount(discount);
  if (!d) return amount;
  const result = "percent" in d ? amount * (1 - d.percent / 100) : amount - d.amount;
  return Math.max(0, result);
}

export function lineTotal(line: { qty: string; price: string; discount: string }): number {
  const base = (parseFloat(line.qty) || 0) * (parseFloat(line.price) || 0);
  return applyDiscountToAmount(base, line.discount);
}
