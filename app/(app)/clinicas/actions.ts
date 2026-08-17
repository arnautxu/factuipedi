"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClinic, createDeliveryNoteWithLines, getClinic, getDeliveryNoteLinesForNotes, updateClinic } from "@/lib/supabase/queries";
import { emptyHeader, type LineItem } from "@/types/albaran";

const clinicInput = (formData: FormData) => ({
  name: String(formData.get("name") ?? "").trim(),
  behandelaar: String(formData.get("behandelaar") ?? "").trim() || null,
  address: String(formData.get("address") ?? "").trim() || null,
  notes: String(formData.get("notes") ?? "").trim() || null,
});

export async function createClinicAction(formData: FormData) {
  const clinic = await createClinic(clinicInput(formData));
  revalidatePath("/clinicas");
  revalidatePath("/clientes");
  redirect(`/clinicas/${clinic.id}`);
}

export async function updateClinicAction(id: string, formData: FormData) {
  await updateClinic(id, clinicInput(formData));
  revalidatePath("/clinicas");
  revalidatePath(`/clinicas/${id}`);
  revalidatePath("/clientes");
}

export async function getClinicCombinedLinesAction(clinicId: string, noteIds: string[]) {
  const clinic = await getClinic(clinicId);
  if (!clinic) throw new Error("No se ha encontrado la clínica.");
  const linesByNote = await getDeliveryNoteLinesForNotes(noteIds);
  const lines: LineItem[] = [];
  for (const noteId of noteIds) {
    for (const line of linesByNote.get(noteId) ?? []) lines.push({ code: line.code ?? "", description: line.description ?? "", qty: line.qty != null ? String(line.qty) : "", price: line.price != null ? String(line.price) : "", priceText: line.price_text ?? "", discount: "" });
  }
  return { header: { ...emptyHeader(), behandelaar: clinic.behandelaar ?? "", klant_regel2: clinic.address ?? "", in_opdracht: clinic.name }, lines };
}

export async function saveClinicCombinedInvoiceAction(clinicId: string, header: ReturnType<typeof emptyHeader>, lines: LineItem[]) {
  await createDeliveryNoteWithLines(null, header, lines, "combined");
  revalidatePath(`/clinicas/${clinicId}`);
}
