"use server";

import { revalidatePath } from "next/cache";
import { parseWorkbook } from "@/lib/catalog/parseWorkbook";
import {
  replaceCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  swapCatalogItemPositions,
  getCatalogItems,
} from "@/lib/supabase/queries";
import type { CatalogItem } from "@/types/database";

function revalidateCatalog() {
  revalidatePath("/catalogo");
  revalidatePath("/albaran/nuevo");
}

export async function importFromXlsxAction(buf: ArrayBuffer): Promise<{ count: number }> {
  const items = parseWorkbook(buf);
  const count = await replaceCatalogItems(items);
  revalidateCatalog();
  return { count };
}

export async function createItemAction(input: {
  cat: string;
  code: string;
  description: string;
  price: number | null;
  priceText: string | null;
}): Promise<CatalogItem> {
  const item = await createCatalogItem({
    cat: input.cat || "Varios",
    code: input.code,
    description: input.description,
    price: input.price,
    price_text: input.priceText,
  });
  revalidateCatalog();
  return item;
}

export async function updateItemAction(
  id: string,
  input: { cat: string; code: string; description: string; price: number | null; priceText: string | null }
): Promise<CatalogItem> {
  const item = await updateCatalogItem(id, {
    cat: input.cat,
    code: input.code,
    description: input.description,
    price: input.price,
    price_text: input.priceText,
  });
  revalidateCatalog();
  return item;
}

export async function deleteItemAction(id: string): Promise<void> {
  await deleteCatalogItem(id);
  revalidateCatalog();
}

export async function moveItemAction(id: string, direction: "up" | "down"): Promise<void> {
  const items = await getCatalogItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return;
  await swapCatalogItemPositions(items[idx].id, items[idx].position, items[swapIdx].id, items[swapIdx].position);
  revalidateCatalog();
}
