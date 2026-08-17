"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClient,
  updateClient,
  deleteClient,
  getClient,
  getDeliveryNoteLinesForNotes,
  createDeliveryNoteWithLines,
  bulkInsertClients,
} from "@/lib/supabase/queries";
import { emptyHeader, type LineItem } from "@/types/albaran";
import type { Client } from "@/types/database";

export async function createClientAction(formData: FormData) {
  const client = await createClient({
    naam_patient: String(formData.get("naam_patient") ?? "").trim() || null,
    clinic_id: String(formData.get("clinic_id") ?? "").trim() || null,
    in_opdracht: String(formData.get("in_opdracht") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/clientes");
  revalidatePath("/albaran/nuevo");
  redirect(`/clientes/${client.id}`);
}

export async function updateClientAction(id: string, formData: FormData) {
  await updateClient(id, {
    naam_patient: String(formData.get("naam_patient") ?? "").trim() || null,
    clinic_id: String(formData.get("clinic_id") ?? "").trim() || null,
    in_opdracht: String(formData.get("in_opdracht") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/albaran/nuevo");
}

export async function deleteClientAction(id: string) {
  await deleteClient(id);
  revalidatePath("/clientes");
  revalidatePath("/albaran/nuevo");
  redirect("/clientes");
}

export async function importClientsAction(rows: Partial<Client>[]): Promise<{ count: number }> {
  const count = await bulkInsertClients(rows);
  revalidatePath("/clientes");
  revalidatePath("/albaran/nuevo");
  return { count };
}

// Combina les línies de diversos albarans del client en una sola llista, per
// generar-ne un PDF conjunt (la generació del PDF és client-side, com a la
// resta de l'app — aquesta acció només prepara les dades).
export async function getCombinedLinesAction(
  clientId: string,
  noteIds: string[]
): Promise<{ header: ReturnType<typeof emptyHeader>; lines: LineItem[] }> {
  const client = await getClient(clientId);
  const linesByNote = await getDeliveryNoteLinesForNotes(noteIds);

  const lines: LineItem[] = [];
  for (const noteId of noteIds) {
    for (const l of linesByNote.get(noteId) ?? []) {
      lines.push({
        code: l.code ?? "",
        description: l.description ?? "",
        qty: l.qty != null ? String(l.qty) : "",
        price: l.price != null ? String(l.price) : "",
        priceText: l.price_text ?? "",
        discount: "",
      });
    }
  }

  const header = {
    ...emptyHeader(),
    naam_patient: client?.naam_patient ?? "",
    geboortedatum: client?.geboortedatum ?? "",
    behandelaar: client?.behandelaar ?? "",
    klant_regel2: client?.klant_regel2 ?? "",
    in_opdracht: client?.in_opdracht ?? "",
  };

  return { header, lines };
}

export async function saveCombinedInvoiceAction(
  clientId: string,
  header: ReturnType<typeof emptyHeader>,
  lines: LineItem[]
): Promise<string> {
  const note = await createDeliveryNoteWithLines(clientId, header, lines, "combined");
  revalidatePath(`/clientes/${clientId}`);
  return note.id;
}
