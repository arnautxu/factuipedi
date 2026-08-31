import { notFound } from "next/navigation";
import EditAlbaranClient from "@/components/EditAlbaranClient";
import { getClient, getDeliveryNote, getDeliveryNoteLines } from "@/lib/supabase/queries";
import { getCatalog } from "@/lib/catalog/getCatalog";
import type { AlbaranHeader, LineItem } from "@/types/albaran";

export default async function EditAlbaranPage({ params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params;
  const [client, note, lines, catalog] = await Promise.all([
    getClient(id),
    getDeliveryNote(noteId),
    getDeliveryNoteLines(noteId),
    getCatalog(),
  ]);
  if (!client || !note || note.client_id !== id) notFound();

  const header: AlbaranHeader = {
    pakbonnummer: note.pakbonnummer ?? "",
    inkomstdatum: note.inkomstdatum ?? "",
    uitgiftedatum: note.uitgiftedatum ?? "",
    naam_patient: note.naam_patient ?? "",
    geboortedatum: note.geboortedatum ?? "",
    behandelaar: note.behandelaar ?? "",
    klant_regel2: note.klant_regel2 ?? "",
    kleur: note.kleur ?? "",
    in_opdracht: note.in_opdracht ?? "",
  };

  const lineItems: LineItem[] = lines.map((l) => ({
    code: l.code ?? "",
    description: l.description ?? "",
    qty: l.qty != null ? String(l.qty) : "",
    price: l.price != null ? String(l.price) : "",
    priceText: l.price_text ?? "",
    discount: l.discount ?? "",
  }));

  return (
    <EditAlbaranClient
      noteId={noteId}
      clientId={id}
      clientName={client.naam_patient ?? ""}
      catalog={catalog}
      initialHeader={header}
      initialLines={lineItems}
      initialDocumentDiscount={note.document_discount ?? ""}
    />
  );
}
