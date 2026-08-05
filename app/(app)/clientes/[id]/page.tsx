import Link from "next/link";
import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import { getClient, getDeliveryNotesForClient } from "@/lib/supabase/queries";
import { updateClientAction, deleteClientAction } from "../actions";

const eur = (v: number | null) => (v == null ? "—" : v.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }));

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
          <span className="text-xs text-[var(--muted)]">Fase 5/6: pujar externs i factura combinada — properament</span>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-[var(--muted)] px-5 py-6">Encara no hi ha albarans per a aquest client.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
                <th className="px-5 py-2.5">Pakbonnummer</th>
                <th className="px-5 py-2.5">Data</th>
                <th className="px-5 py-2.5">Origen</th>
                <th className="px-5 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className="border-b border-[var(--line-soft,#eef2f8)] last:border-0">
                  <td className="px-5 py-2.5 font-medium">{n.pakbonnummer || "—"}</td>
                  <td className="px-5 py-2.5 text-[var(--muted)]">{n.uitgiftedatum || "—"}</td>
                  <td className="px-5 py-2.5 text-[var(--muted)] capitalize">{n.source}</td>
                  <td className="px-5 py-2.5 text-right">{eur(n.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
