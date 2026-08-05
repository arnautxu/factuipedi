import { EMBEDDED_CATALOG } from "./embeddedCatalog";
import { getCatalogItems } from "@/lib/supabase/queries";
import type { CatalogEntry } from "@/types/catalog";

// Catàleg servit des de Supabase (font de veritat des de la Fase 4).
// Si Supabase encara no està migrat/configurat, o la taula és buida, es
// recorre al catàleg incrustat de l'app original — mateixa resiliència que
// abans tenia el fetch en temps real al Google Sheet.
export async function getCatalog(): Promise<CatalogEntry[]> {
  try {
    const items = await getCatalogItems();
    if (items.length) {
      return items.map((it) => ({
        cat: it.cat,
        code: it.code,
        description: it.description,
        price: it.price,
        priceText: it.price_text,
      }));
    }
  } catch (err) {
    console.log("No s'ha pogut llegir el catàleg de Supabase, uso el catàleg incrustat:", err);
  }

  return EMBEDDED_CATALOG.map((it) => ({
    cat: it.cat,
    code: it.code,
    description: it.description,
    price: it.price,
    priceText: it.price_text,
  }));
}
