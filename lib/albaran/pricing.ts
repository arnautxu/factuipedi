// Descompte com a text lliure ("10", "10%"): sempre es tracta com a percentatge
// (el "%" és opcional). El signe s'ignora — un descompte sempre resta.
export function parseDiscount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const cleaned = s.replace(/[%\s]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n === 0) return null;
  return Math.abs(n);
}

export function applyDiscountToAmount(amount: number, discount: string): number {
  const percent = parseDiscount(discount);
  if (percent == null) return amount;
  return Math.max(0, amount * (1 - percent / 100));
}

// Un albarà sempre factura com a mínim 1 unitat per línia — si la quantitat
// s'ha deixat buida o esborrada per error, no ha de fer desaparèixer l'import.
export function lineTotal(line: { qty: string; price: string; discount: string }): number {
  const qty = Math.max(1, parseFloat(line.qty) || 0);
  const base = qty * (parseFloat(line.price) || 0);
  return applyDiscountToAmount(base, line.discount);
}
