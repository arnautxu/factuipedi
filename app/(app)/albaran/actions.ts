"use server";

import { revalidatePath } from "next/cache";
import { createDeliveryNoteWithLines, updateDeliveryNoteWithLines } from "@/lib/supabase/queries";
import type { AlbaranHeader, LineItem } from "@/types/albaran";

export async function saveAlbaranAction(clientId: string | null, header: AlbaranHeader, lines: LineItem[]) {
  const note = await createDeliveryNoteWithLines(clientId, header, lines, "created");
  if (clientId) revalidatePath(`/clientes/${clientId}`);
  return note.id;
}

export async function updateAlbaranAction(
  noteId: string,
  clientId: string,
  header: AlbaranHeader,
  lines: LineItem[]
) {
  const note = await updateDeliveryNoteWithLines(noteId, header, lines);
  revalidatePath(`/clientes/${clientId}`);
  return note.id;
}
