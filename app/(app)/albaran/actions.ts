"use server";

import { revalidatePath } from "next/cache";
import { createPatientAndDeliveryNote, updateDeliveryNoteWithLines } from "@/lib/supabase/queries";
import type { AlbaranHeader, LineItem } from "@/types/albaran";

export async function saveAlbaranAction(clientId: string | null, clinicId: string | null, header: AlbaranHeader, lines: LineItem[]) {
  if (!clinicId) throw new Error("Selecciona una clínica activa.");
  const created = await createPatientAndDeliveryNote(clientId, clinicId, header, lines, "created");
  revalidatePath(`/clientes/${created.clientId}`);
  revalidatePath(`/clinicas/${clinicId}`);
  revalidatePath("/albaran/nuevo");
  return created;
}

export async function updateAlbaranAction(
  noteId: string,
  clientId: string,
  header: AlbaranHeader,
  lines: LineItem[],
  documentDiscount = ""
) {
  const note = await updateDeliveryNoteWithLines(noteId, header, lines, documentDiscount);
  revalidatePath(`/clientes/${clientId}`);
  return note.id;
}
