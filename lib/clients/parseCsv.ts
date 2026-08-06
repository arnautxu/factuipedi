import * as XLSX from "xlsx";

// Parseja un CSV pujat per l'usuari en files crues (cap suposició sobre l'ordre de
// columnes — el mapeig als camps del client es fa manualment a la UI d'importació).
export function parseCsvRows(text: string): string[][] {
  const wb = XLSX.read(text, { type: "string" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
  return rows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell !== ""));
}
