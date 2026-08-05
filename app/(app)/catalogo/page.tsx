import CatalogoClient from "@/components/CatalogoClient";
import { getCatalogItems } from "@/lib/supabase/queries";

export default async function CatalogoPage() {
  const catalog = await getCatalogItems();
  return <CatalogoClient catalog={catalog} />;
}
