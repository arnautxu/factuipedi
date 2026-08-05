import * as XLSX from "xlsx";
import { cleanCode, cleanPrice } from "./parseUtils";
import type { EmbeddedCatalogItem } from "./embeddedCatalog";

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1kEWWn9k8dXV3GvosCsU1Q8lL9zbs7AHvm8mzebD225E/gviz/tq?tqx=out:csv";
export const SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1kEWWn9k8dXV3GvosCsU1Q8lL9zbs7AHvm8mzebD225E/edit";

// Parseja el CSV publicat del Google Sheet (columnes: Categoría, Código, Descripción, Precio).
// Portat literalment de l'index.html original — mateixa detecció de capçalera per nom de columna.
export function parseSheetCsv(text: string): EmbeddedCatalogItem[] {
  const wb = XLSX.read(text, { type: "string" });
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    raw: false,
    defval: "",
  });

  let hdr = -1;
  let ci = { cat: 0, code: 1, desc: 2, price: 3 };
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const low = (rows[i] || []).map((c) => String(c || "").toLowerCase());
    const j = low.findIndex((c) => c.includes("cód") || c.includes("cod"));
    if (j >= 0) {
      hdr = i;
      const find = (...keys: string[]) => low.findIndex((c) => keys.some((k) => c.includes(k)));
      ci = { cat: find("categor"), code: j, desc: find("descr", "omschr"), price: find("prec", "tarifa", "prijs", "€") };
      break;
    }
  }
  if (hdr < 0) return [];

  const items: EmbeddedCatalogItem[] = [];
  for (let i = hdr + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const code = cleanCode(r[ci.code]);
    const description = (r[ci.desc] != null ? String(r[ci.desc]) : "").trim();
    if (!code && !description) continue;
    const { price, priceText } = cleanPrice(r[ci.price]);
    items.push({
      cat: (r[ci.cat] != null ? String(r[ci.cat]) : "").trim() || "Varios",
      code,
      description,
      price,
      price_text: priceText,
    });
  }
  return items;
}
