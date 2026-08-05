import { notFound } from "next/navigation";
import SubirAlbaranClient from "@/components/SubirAlbaranClient";
import { getClient } from "@/lib/supabase/queries";

export default async function SubirAlbaranPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-[var(--navy)]">Pujar albarà extern · {client.naam_patient || "(sense nom)"}</h1>
      <SubirAlbaranClient clientId={id} />
    </div>
  );
}
