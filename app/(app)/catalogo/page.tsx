import CatalogoClient from "@/components/CatalogoClient";
import { getCatalog } from "@/lib/catalog/getCatalog";

export default async function CatalogoPage() {
  const catalog = await getCatalog();
  return <CatalogoClient catalog={catalog} />;
}
