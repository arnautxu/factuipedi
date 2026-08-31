"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createImportedWork,
  uploadDeliveryNoteDocument,
  getClient,
  getDeliveryNoteDocumentUrl,
  getImportedWorkByExternalCode,
  updateUploadedDocument,
  updateImportedWork,
  createDeliveryNoteWithLines,
} from "@/lib/supabase/queries";
import { extractDeliveryNoteFromPdf, type ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import { emptyHeader, type LineItem } from "@/types/albaran";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import type { ImportedWork } from "@/types/database";

async function currentActor() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  return typeof payload?.sub === "string" && payload.sub ? payload.sub : "sistema";
}

function extractionAlerts(extracted: ExtractedDeliveryNote) {
  const alerts: string[] = [];
  if (!extracted.external_code) alerts.push("No se ha detectado un código externo: no se podrá comprobar duplicados automáticamente.");
  if (!extracted.patient_name) alerts.push("No se ha detectado el paciente.");
  if (!extracted.lines.length) alerts.push("No se han detectado productos o servicios.");
  if (extracted.lines.some((line) => !line.code)) alerts.push("Hay líneas sin código de producto.");
  if (extracted.lines.some((line) => !line.price)) alerts.push("Hay líneas sin precio.");
  return alerts;
}

function publicExtractionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("temporalmente saturado")) return message;
  if (message.includes("GEMINI_API_KEY")) {
    return "El servicio de extracción no está configurado. Contacta con el administrador.";
  }
  return "No se han podido leer los datos automáticamente. El PDF se ha conservado para volver a intentarlo.";
}

export async function uploadAndExtractAction(
  clientId: string,
  formData: FormData
): Promise<{ documentId: string; pdfUrl: string; work: ImportedWork; extracted: ExtractedDeliveryNote } | { error: string; pdfUrl?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Ningún archivo seleccionado." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "El archivo debe ser un PDF." };
  }

  const [doc, client, actor, fileBuffer] = await Promise.all([
    uploadDeliveryNoteDocument(clientId, file),
    getClient(clientId),
    currentActor(),
    file.arrayBuffer(),
  ]);

  try {
    const bytes = new Uint8Array(fileBuffer);
    const extracted = await extractDeliveryNoteFromPdf(bytes);
    const alerts = extractionAlerts(extracted);
    const existing = extracted.external_code
      ? await getImportedWorkByExternalCode(extracted.external_code)
      : null;
    if (existing) {
      const [, pdfUrl] = await Promise.all([
        updateUploadedDocument(doc.id, { status: "duplicate", extraction_raw: extracted }),
        getDeliveryNoteDocumentUrl(doc.storage_path),
      ]);
      return {
        error: `El código externo ${extracted.external_code} ya existe en otro trabajo importado. El PDF se ha conservado, pero no se ha creado un duplicado.`,
        pdfUrl,
      };
    }
    const [work, , pdfUrl] = await Promise.all([
      createImportedWork({
        clientId,
        clinicId: client?.clinic_id ?? null,
        uploadedDocumentId: doc.id,
        externalCode: extracted.external_code,
        patientName: extracted.patient_name,
        documentDate: extracted.date,
        productSummary: extracted.lines.map((line) => line.description).filter(Boolean).join(" · "),
        extractedPayload: extracted,
        alerts,
        actor,
      }),
      updateUploadedDocument(doc.id, { status: "extracted", extraction_raw: extracted }),
      getDeliveryNoteDocumentUrl(doc.storage_path),
    ]);
    return { documentId: doc.id, pdfUrl, work, extracted };
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && err.code === "23505") {
      await updateUploadedDocument(doc.id, { status: "duplicate" });
      return {
        error: "Ya existe un trabajo importado con este código externo. El PDF se ha conservado, pero se ha bloqueado el duplicado.",
        pdfUrl: await getDeliveryNoteDocumentUrl(doc.storage_path),
      };
    }
    await updateUploadedDocument(doc.id, { status: "failed" });
    return {
      error: publicExtractionError(err),
      pdfUrl: await getDeliveryNoteDocumentUrl(doc.storage_path),
    };
  }
}

export async function saveExtractedNoteAction(
  clientId: string,
  documentId: string,
  workId: string,
  externalCode: string,
  patientName: string,
  date: string,
  lines: LineItem[],
  documentDiscount = ""
): Promise<{ noteId: string } | { error: string }> {
  try {
    const [client, actor] = await Promise.all([getClient(clientId), currentActor()]);
    if (!client) return { error: "No se ha encontrado el paciente." };
    const extracted = { external_code: externalCode, patient_name: patientName, date, discount: documentDiscount, lines };
    await updateImportedWork(workId, {
      external_code: externalCode.trim().toUpperCase() || null,
      patient_name: patientName.trim() || null,
      document_date: date.trim() || null,
      product_summary: lines.map((line) => line.description).filter(Boolean).join(" · ") || null,
      extracted_payload: extracted,
      status: "reviewed",
      updated_by: actor,
    });
    const header = { ...emptyHeader(), naam_patient: patientName, uitgiftedatum: date };
    const note = await createDeliveryNoteWithLines(clientId, header, lines, "uploaded", documentDiscount, client.clinic_id);
    await updateImportedWork(workId, { status: "converted", final_delivery_note_id: note.id, updated_by: actor });
    await updateUploadedDocument(documentId, { status: "reviewed", delivery_note_id: note.id });
    revalidatePath(`/clientes/${clientId}`);
    return { noteId: note.id };
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && err.code === "23505") {
      return { error: "El código externo ya existe en otro trabajo importado. Corrígelo antes de crear el albarán final." };
    }
    return { error: "Error al guardar el albarán: " + (err instanceof Error ? err.message : String(err)) };
  }
}
