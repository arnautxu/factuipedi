"use server";

import { revalidatePath } from "next/cache";
import { createDeliveryNoteWithLines } from "@/lib/supabase/queries";
import type { AlbaranHeader, LineItem } from "@/types/albaran";

export async function saveAlbaranAction(clientId: string | null, header: AlbaranHeader, lines: LineItem[]) {
  const note = await createDeliveryNoteWithLines(clientId, header, lines, "created");
  if (clientId) revalidatePath(`/clientes/${clientId}`);
  return note.id;
}
