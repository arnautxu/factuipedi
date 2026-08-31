import Link from "next/link";
import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import DeliveryNotesTable from "@/components/DeliveryNotesTable";
import DeleteClientButton from "@/components/DeleteClientButton";
import { Card } from "@/components/ui/Card";
import {
  getClient,
  getClinics,
  getDeliveryNoteDocumentUrl,
  getDeliveryNotesForClient,
  getUploadedDocumentsForClient,
} from "@/lib/supabase/queries";
import { updateClientAction, deleteClientAction } from "../actions";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const [notes, uploadedDocuments] = await Promise.all([getDeliveryNotesForClient(id), getUploadedDocumentsForClient(id)]);
  const originalDocumentByNote = new Map<string, (typeof uploadedDocuments)[number]>();
  for (const document of uploadedDocuments) {
    if (document.delivery_note_id && !originalDocumentByNote.has(document.delivery_note_id)) {
      originalDocumentByNote.set(document.delivery_note_id, document);
    }
  }
  const originalDocumentUrlEntries = await Promise.all(
    [...originalDocumentByNote.entries()].map(async ([noteId, document]) => {
      try {
        return [noteId, await getDeliveryNoteDocumentUrl(document.storage_path)] as const;
      } catch {
        // A missing legacy file must not prevent the patient's records from loading.
        return null;
      }
    })
  );
  const originalDocumentUrls = Object.fromEntries(
    originalDocumentUrlEntries.filter((entry): entry is readonly [string, string] => entry !== null)
  );
  const clinics = await getClinics();
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
        <DeliveryNotesTable clientId={id} notes={notes} originalDocumentUrls={originalDocumentUrls} />
      </Card>
    </div>
  );
}
