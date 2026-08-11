"use server";

import { revalidatePath } from "next/cache";
import {
  uploadDeliveryNoteDocument,
  downloadDeliveryNoteDocument,
  updateUploadedDocument,
  createDeliveryNoteWithLines,
} from "@/lib/supabase/queries";
import { extractDeliveryNoteFromPdf, type ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import { emptyHeader, type LineItem } from "@/types/albaran";

export async function uploadAndExtractAction(
  clientId: string,
  formData: FormData
): Promise<{ documentId: string; extracted: ExtractedDeliveryNote } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Cap fitxer seleccionat." };
  }

  const doc = await uploadDeliveryNoteDocument(clientId, file);

  try {
    const bytes = await downloadDeliveryNoteDocument(doc.storage_path);
    const extracted = await extractDeliveryNoteFromPdf(bytes);
    await updateUploadedDocument(doc.id, { status: "extracted", extraction_raw: extracted });
    return { documentId: doc.id, extracted };
  } catch (err) {
    await updateUploadedDocument(doc.id, { status: "failed" });
    return { error: "Error extraient dades del PDF: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function saveExtractedNoteAction(
  clientId: string,
  documentId: string,
  patientName: string,
  date: string,
  lines: LineItem[],
  documentDiscount = ""
): Promise<{ noteId: string } | { error: string }> {
  try {
    const header = { ...emptyHeader(), naam_patient: patientName, uitgiftedatum: date };
    const note = await createDeliveryNoteWithLines(clientId, header, lines, "uploaded", documentDiscount);
    await updateUploadedDocument(documentId, { status: "reviewed", delivery_note_id: note.id });
    revalidatePath(`/clientes/${clientId}`);
    return { noteId: note.id };
  } catch (err) {
    return { error: "Error desant l'albarà: " + (err instanceof Error ? err.message : String(err)) };
  }
}
