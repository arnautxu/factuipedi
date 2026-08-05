"use server";

import { revalidatePath } from "next/cache";
import { parseSheetCsv, SHEET_CSV_URL } from "@/lib/catalog/parseSheetCsv";
import { parseWorkbook } from "@/lib/catalog/parseWorkbook";
import { EMBEDDED_CATALOG } from "@/lib/catalog/embeddedCatalog";
import { replaceCatalogItems } from "@/lib/supabase/queries";

export async function importFromSheetAction(): Promise<{ count: number; source: string }> {
  let items: typeof EMBEDDED_CATALOG = [];
  let source = "Google Sheet";
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    items = parseSheetCsv(text);
  } catch {
    items = [];
  }
  if (!items.length) {
    items = EMBEDDED_CATALOG;
    source = "catàleg incrustat (el Sheet no ha respost)";
  }
  const count = await replaceCatalogItems(items);
  revalidatePath("/catalogo");
  revalidatePath("/albaran/nuevo");
  return { count, source };
}

export async function importFromXlsxAction(buf: ArrayBuffer): Promise<{ count: number }> {
  const items = parseWorkbook(buf);
  const count = await replaceCatalogItems(items);
  revalidatePath("/catalogo");
  revalidatePath("/albaran/nuevo");
  return { count };
}
