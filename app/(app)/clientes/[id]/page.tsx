import Link from "next/link";
import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import DeliveryNotesTable from "@/components/DeliveryNotesTable";
import { getClient, getDeliveryNotesForClient } from "@/lib/supabase/queries";
import { updateClientAction, deleteClientAction } from "../actions";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const notes = await getDeliveryNotesForClient(id);
  const boundUpdate = updateClientAction.bind(null, id);
  const boundDelete = deleteClientAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">{client.naam_patient || "(sense nom)"}</h1>
          <Link href="/clientes" className="text-xs text-[var(--muted)] hover:underline">
            ← Tornar a clients
          </Link>
        </div>
        <form action={boundDelete}>
          <button type="submit" className="text-xs font-medium text-red-500 hover:text-red-700">
            Eliminar client
          </button>
        </form>
      </div>

      <ClientForm client={client} action={boundUpdate} submitLabel="Desar canvis" />

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
          <h2 className="text-sm font-bold text-[var(--navy)]">Albarans</h2>
          <Link href={`/clientes/${id}/subir`} className="text-xs font-semibold text-[var(--navy)] hover:underline">
            + Pujar albarà extern
          </Link>
        </div>
        <DeliveryNotesTable clientId={id} notes={notes} />
      </div>
    </div>
  );
}
