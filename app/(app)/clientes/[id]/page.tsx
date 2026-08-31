import Link from "next/link";
import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import DeliveryNotesTable from "@/components/DeliveryNotesTable";
import ImportedWorksList from "@/components/ImportedWorksList";
import DeleteClientButton from "@/components/DeleteClientButton";
import { Card } from "@/components/ui/Card";
import { getClient, getClinic, getClinics, getDeliveryNotesForClient, getImportedWorksForClient } from "@/lib/supabase/queries";
import { updateClientAction, deleteClientAction } from "../actions";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const [notes, importedWorks] = await Promise.all([getDeliveryNotesForClient(id), getImportedWorksForClient(id)]);
  const monthlyClinicId = notes.find((note) => note.clinic_id)?.clinic_id ?? client.clinic_id;
  const [clinics, monthlyClinic] = await Promise.all([
    getClinics(),
    monthlyClinicId ? getClinic(monthlyClinicId) : Promise.resolve(null),
  ]);
  const boundUpdate = updateClientAction.bind(null, id);
  const boundDelete = deleteClientAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">{client.naam_patient || client.behandelaar || "Ficha de paciente"}</h1>
          <Link
            href="/clientes"
            className="rounded text-xs text-[var(--muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            ← Volver a pacientes
          </Link>
        </div>
        <DeleteClientButton clientName={client.naam_patient ?? client.behandelaar ?? ""} action={boundDelete} />
      </div>

      <ClientForm client={client} clinics={clinics} action={boundUpdate} submitLabel="Guardar cambios" />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)]">
          <h2 className="text-sm font-bold text-[var(--navy)]">Albaranes</h2>
          <Link
            href={`/clientes/${id}/subir`}
            className="rounded text-xs font-semibold text-[var(--navy)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            + Subir albarán externo
          </Link>
        </div>
        <DeliveryNotesTable clientId={id} clinic={monthlyClinic} notes={notes} />
      </Card>

      <ImportedWorksList clientId={id} works={importedWorks} />
    </div>
  );
}
