import * as XLSX from "xlsx";
import { cleanCode, cleanPrice } from "./parseUtils";
import type { EmbeddedCatalogItem } from "./embeddedCatalog";

// Parseja un ArrayBuffer .xlsx pujat per l'usuari. Portat literalment de l'index.html original.
export function parseWorkbook(buf: ArrayBuffer): EmbeddedCatalogItem[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const items: EmbeddedCatalogItem[] = [];
  wb.SheetNames.forEach((name) => {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    let start = 0;
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      if ((rows[i] || []).map((c) => String(c ?? "").toUpperCase()).join(" ").includes("COD")) {
        start = i + 1;
        break;
      }
    }
    for (let i = start; i < rows.length; i++) {
      const r = rows[i] || [];
      const code = cleanCode(r[0]);
      const description = r[1] == null ? "" : String(r[1]).trim();
      if (!code && !description) continue;
      const { price, priceText } = cleanPrice(r[2]);
      items.push({ cat: name, code, description, price, price_text: priceText });
    }
  });
  return items;
}
