import AlbaranNuevoClient from "@/components/AlbaranNuevoClient";
import { getCatalog } from "@/lib/catalog/getCatalog";
import { getClients } from "@/lib/supabase/queries";

export default async function NuevoAlbaranPage() {
  const catalog = await getCatalog();
  let clients: Awaited<ReturnType<typeof getClients>> = [];
  try {
    clients = await getClients();
  } catch {
    // Supabase encara no configurat/migrat — el picker de client simplement queda buit.
  }
  return <AlbaranNuevoClient catalog={catalog} clients={clients} />;
}
