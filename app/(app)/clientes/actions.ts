"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import type { ActionResult } from "@/lib/ui/action-result";
import {
  createDeliveryNoteWithLines,
  createClient,
  getClient,
  getClinic,
  getDeliveryNoteLinesForNotes,
  getDeliveryNotesForClient,
  updateClient,
  deleteClient,
  bulkInsertClients,
} from "@/lib/supabase/queries";
import type { Client } from "@/types/database";
import { emptyHeader, type AlbaranHeader, type LineItem } from "@/types/albaran";
import { parseDiscount } from "@/lib/albaran/pricing";

async function saveClient(id: string | null, formData: FormData): Promise<ActionResult> {
  await requireSession();
  const naam_patient = String(formData.get("naam_patient") ?? "").trim();
  if (!naam_patient) return { error: "Escribe el nombre del paciente.", field: "naam_patient" };
  const input = { naam_patient, clinic_id: String(formData.get("clinic_id") ?? "").trim() || null, in_opdracht: String(formData.get("in_opdracht") ?? "").trim() || null, notes: String(formData.get("notes") ?? "").trim() || null };
  try {
    // An archived clinic is valid only when preserving the existing assignment.
    if (input.clinic_id) {
      const clinic = await getClinic(input.clinic_id);
      const current = id ? await getClient(id) : null;
      if (!clinic || (clinic.active === false && current?.clinic_id !== input.clinic_id)) return { error: "Selecciona una clínica activa.", field: "clinic_id" };
    }
    const client = id ? await updateClient(id, input) : await createClient(input);
    revalidatePath("/clientes"); revalidatePath(`/clientes/${client.id}`); revalidatePath("/albaran/nuevo");
    return { message: id ? "Cambios del paciente guardados." : "Paciente creado.", redirectTo: id ? undefined : `/clientes/${client.id}` };
  } catch { return { error: "No se han podido guardar los datos del paciente. Vuelve a intentarlo." }; }
}
export async function createClientAction(formData: FormData) { return saveClient(null, formData); }
export async function updateClientAction(id: string, formData: FormData) { return saveClient(id, formData); }
export async function deleteClientAction(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    await deleteClient(id); revalidatePath("/clientes"); revalidatePath("/albaran/nuevo");
    return { message: "Paciente eliminado. Sus albaranes se conservan desvinculados.", redirectTo: "/clientes" };
  } catch { return { error: "No se ha podido eliminar el paciente. Vuelve a intentarlo." }; }
}

export async function importClientsAction(rows: Partial<Client>[]): Promise<{ count: number }> {
  const count = await bulkInsertClients(rows);
  revalidatePath("/clientes");
  revalidatePath("/albaran/nuevo");
  return { count };
}

function combineDiscounts(lineDiscount: string, documentDiscount: string) {
  const linePercent = parseDiscount(lineDiscount) ?? 0;
  const documentPercent = parseDiscount(documentDiscount) ?? 0;
  if (documentPercent === 0) return lineDiscount;

  const multiplier =
    Math.max(0, 1 - linePercent / 100) *
    Math.max(0, 1 - documentPercent / 100);
  const effectivePercent = Math.min(100, Math.max(0, (1 - multiplier) * 100));
  return Number(effectivePercent.toFixed(4)).toString();
}

function normalizedName(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("es-ES");
}

function noteHeaderScore(note: Awaited<ReturnType<typeof getDeliveryNotesForClient>>[number]) {
  return [
    note.naam_patient,
    note.geboortedatum,
    note.behandelaar,
    note.klant_regel2,
    note.in_opdracht,
    note.inkomstdatum,
    note.uitgiftedatum,
    note.kleur,
  ].filter((value) => Boolean(value?.trim())).length;
}

export async function getCombinedLinesAction(clientId: string, noteIds: string[]) {
  if (noteIds.length === 0) throw new Error("Selecciona al menos un albarán.");

  const [client, clientNotes] = await Promise.all([
    getClient(clientId),
    getDeliveryNotesForClient(clientId),
  ]);
  const selectableNotes = new Map(
    clientNotes.filter((note) => note.source !== "combined").map((note) => [note.id, note]),
  );
  const notes = noteIds.map((id) => selectableNotes.get(id));
  if (notes.some((note) => !note)) {
    throw new Error("Alguno de los albaranes seleccionados no pertenece a este paciente.");
  }

  const selectedNotes = notes.filter((note): note is NonNullable<typeof note> => Boolean(note));
  const clinicIds = new Set(
    selectedNotes.map((note) => note.clinic_id).filter((id): id is string => Boolean(id)),
  );
  if (clinicIds.size > 1) throw new Error("Selecciona albaranes de una misma clínica.");

  const linesByNote = await getDeliveryNoteLinesForNotes(noteIds);
  const lines: LineItem[] = selectedNotes.flatMap((note) =>
    (linesByNote.get(note.id) ?? []).map((line) => ({
      code: line.code ?? "",
      description: line.description ?? "",
      qty: line.qty == null ? "1" : String(line.qty),
      price: line.price == null ? "" : String(line.price),
      priceText: line.price_text ?? "",
      discount: combineDiscounts(line.discount ?? "", note.document_discount ?? ""),
    })),
  );
  const clientName = normalizedName(client?.naam_patient);
  const referenceNote =
    selectedNotes.find((note) => clientName && normalizedName(note.naam_patient) === clientName) ??
    selectedNotes.reduce((best, note) => noteHeaderScore(note) > noteHeaderScore(best) ? note : best);
  const header: AlbaranHeader = {
    ...emptyHeader(),
    naam_patient: client?.naam_patient ?? referenceNote.naam_patient ?? "",
    geboortedatum: referenceNote.geboortedatum ?? client?.geboortedatum ?? "",
    behandelaar: referenceNote.behandelaar ?? client?.behandelaar ?? "",
    klant_regel2: referenceNote.klant_regel2 ?? client?.klant_regel2 ?? "",
    in_opdracht: referenceNote.in_opdracht ?? client?.in_opdracht ?? "",
    inkomstdatum: referenceNote.inkomstdatum ?? "",
    uitgiftedatum: referenceNote.uitgiftedatum ?? "",
    kleur: referenceNote.kleur ?? "",
  };

  return { header, lines, clinicId: referenceNote.clinic_id ?? [...clinicIds][0] ?? null };
}

export async function saveCombinedInvoiceAction(
  clientId: string,
  clinicId: string | null,
  header: AlbaranHeader,
  lines: LineItem[],
) {
  const invoice = await createDeliveryNoteWithLines(
    clientId,
    header,
    lines,
    "combined",
    "",
    clinicId,
  );
  revalidatePath(`/clientes/${clientId}`);
  return invoice.id;
}
