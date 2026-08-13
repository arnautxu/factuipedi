import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "./admin";
import type { Client, DeliveryNote, DeliveryNoteLine, CatalogItem, UploadedDocument } from "@/types/database";
import type { AlbaranHeader, LineItem } from "@/types/albaran";
import type { EmbeddedCatalogItem } from "@/lib/catalog/embeddedCatalog";
import { lineTotal, applyDiscountToAmount } from "@/lib/albaran/pricing";

export const DELIVERY_NOTE_PDFS_BUCKET = "delivery-note-pdfs";

export async function getCatalogItems(): Promise<CatalogItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}

// Reimportació massiva (des d'un .xlsx pujat): substitueix l'ordre pel de l'arxiu importat.
export async function replaceCatalogItems(items: EmbeddedCatalogItem[]): Promise<number> {
  if (!items.length) return 0;
  const supabase = createAdminClient();
  const rows = items.map((item, i) => ({
    cat: item.cat,
    code: item.code,
    description: item.description,
    price: item.price,
    price_text: item.price_text,
    active: true,
    position: i,
  }));
  const { error } = await supabase.from("catalog_items").upsert(rows, { onConflict: "code" });
  if (error) throw error;
  return items.length;
}

export async function createCatalogItem(input: {
  cat: string;
  code: string;
  description: string;
  price: number | null;
  price_text: string | null;
}): Promise<CatalogItem> {
  const supabase = createAdminClient();
  const { data: maxRow } = await supabase
    .from("catalog_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow as { position: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({ ...input, active: true, position: nextPosition })
    .select()
    .single();
  if (error) throw error;
  return data as CatalogItem;
}

export async function updateCatalogItem(
  id: string,
  input: Partial<Pick<CatalogItem, "cat" | "code" | "description" | "price" | "price_text">>
): Promise<CatalogItem> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CatalogItem;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) throw error;
}

// Intercanvia la posició de dos ítems (per als botons de pujar/baixar de la UI).
export async function swapCatalogItemPositions(idA: string, posA: number, idB: string, posB: number): Promise<void> {
  const supabase = createAdminClient();
  const { error: e1 } = await supabase.from("catalog_items").update({ position: posB }).eq("id", idA);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("catalog_items").update({ position: posA }).eq("id", idB);
  if (e2) throw e2;
}

export async function getClients(search?: string): Promise<Client[]> {
  const supabase = createAdminClient();
  let query = supabase.from("clients").select("*").order("naam_patient", { ascending: true });
  if (search) {
    query = query.or(`naam_patient.ilike.%${search}%,behandelaar.ilike.%${search}%,klant_regel2.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Client | null;
}

export async function createClient(input: Partial<Client>): Promise<Client> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("clients").insert(input).select().single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, input: Partial<Client>): Promise<Client> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// Importació massiva des d'un CSV: sempre crea files noves (la taula clients no té
// cap clau única per fer-hi upsert), en blocs per evitar payloads massa grans.
export async function bulkInsertClients(rows: Partial<Client>[]): Promise<number> {
  if (!rows.length) return 0;
  const supabase = createAdminClient();
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("clients").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }
  return inserted;
}

export async function getDeliveryNotesForClient(clientId: string): Promise<DeliveryNote[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DeliveryNote[];
}

export async function createDeliveryNoteWithLines(
  clientId: string | null,
  header: AlbaranHeader,
  lines: LineItem[],
  source: DeliveryNote["source"] = "created",
  documentDiscount = ""
): Promise<DeliveryNote> {
  const supabase = createAdminClient();
  const filled = lines.filter((l) => l.code || l.description);
  const subtotal = filled.reduce((s, l) => s + lineTotal(l), 0);
  const total = applyDiscountToAmount(subtotal, documentDiscount);

  const { data: note, error: noteError } = await supabase
    .from("delivery_notes")
    .insert({
      client_id: clientId,
      pakbonnummer: header.pakbonnummer || null,
      inkomstdatum: header.inkomstdatum || null,
      uitgiftedatum: header.uitgiftedatum || null,
      naam_patient: header.naam_patient || null,
      geboortedatum: header.geboortedatum || null,
      behandelaar: header.behandelaar || null,
      klant_regel2: header.klant_regel2 || null,
      kleur: header.kleur || null,
      in_opdracht: header.in_opdracht || null,
      source,
      total,
    })
    .select()
    .single();
  if (noteError) throw noteError;
  const noteRow = note as DeliveryNote;

  if (filled.length) {
    const rows: Partial<DeliveryNoteLine>[] = filled.map((l, i) => ({
      delivery_note_id: noteRow.id,
      position: i,
      code: l.code || null,
      description: l.description || null,
      qty: l.qty ? parseFloat(l.qty) : null,
      price: l.price ? parseFloat(l.price) : null,
      price_text: l.priceText || null,
    }));
    const { error: linesError } = await supabase.from("delivery_note_lines").insert(rows);
    if (linesError) throw linesError;
  }

  return noteRow;
}

export async function getDeliveryNote(id: string): Promise<DeliveryNote | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("delivery_notes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as DeliveryNote | null;
}

// Edita un albarà ja desat: actualitza la capçalera i substitueix totes les
// línies (esborra + reinsereix, com que no tenim un id estable per línia des
// del client per fer un diff).
export async function updateDeliveryNoteWithLines(
  noteId: string,
  header: AlbaranHeader,
  lines: LineItem[]
): Promise<DeliveryNote> {
  const supabase = createAdminClient();
  const filled = lines.filter((l) => l.code || l.description);
  const total = filled.reduce((s, l) => s + lineTotal(l), 0);

  const { data: note, error: noteError } = await supabase
    .from("delivery_notes")
    .update({
      pakbonnummer: header.pakbonnummer || null,
      inkomstdatum: header.inkomstdatum || null,
      uitgiftedatum: header.uitgiftedatum || null,
      naam_patient: header.naam_patient || null,
      geboortedatum: header.geboortedatum || null,
      behandelaar: header.behandelaar || null,
      klant_regel2: header.klant_regel2 || null,
      kleur: header.kleur || null,
      in_opdracht: header.in_opdracht || null,
      total,
    })
    .eq("id", noteId)
    .select()
    .single();
  if (noteError) throw noteError;
  const noteRow = note as DeliveryNote;

  const { error: deleteError } = await supabase.from("delivery_note_lines").delete().eq("delivery_note_id", noteId);
  if (deleteError) throw deleteError;

  if (filled.length) {
    const rows: Partial<DeliveryNoteLine>[] = filled.map((l, i) => ({
      delivery_note_id: noteId,
      position: i,
      code: l.code || null,
      description: l.description || null,
      qty: l.qty ? parseFloat(l.qty) : null,
      price: l.price ? parseFloat(l.price) : null,
      price_text: l.priceText || null,
    }));
    const { error: linesError } = await supabase.from("delivery_note_lines").insert(rows);
    if (linesError) throw linesError;
  }

  return noteRow;
}

export async function getDeliveryNoteLines(deliveryNoteId: string): Promise<DeliveryNoteLine[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_note_lines")
    .select("*")
    .eq("delivery_note_id", deliveryNoteId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DeliveryNoteLine[];
}

// Totes les línies de diversos albarans a la vegada, agrupades per delivery_note_id
// (per construir la previsualització/factura combinada d'un client).
export async function getDeliveryNoteLinesForNotes(noteIds: string[]): Promise<Map<string, DeliveryNoteLine[]>> {
  const map = new Map<string, DeliveryNoteLine[]>();
  if (!noteIds.length) return map;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("delivery_note_lines")
    .select("*")
    .in("delivery_note_id", noteIds)
    .order("position", { ascending: true });
  if (error) throw error;
  for (const line of (data ?? []) as DeliveryNoteLine[]) {
    if (!map.has(line.delivery_note_id)) map.set(line.delivery_note_id, []);
    map.get(line.delivery_note_id)!.push(line);
  }
  return map;
}

export async function getUploadedDocumentsForClient(clientId: string): Promise<UploadedDocument[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("uploaded_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UploadedDocument[];
}

export async function getUploadedDocument(id: string): Promise<UploadedDocument | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("uploaded_documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as UploadedDocument | null;
}

// Puja el PDF a Storage i crea la fila uploaded_documents (status='pending').
export async function uploadDeliveryNoteDocument(
  clientId: string,
  file: File
): Promise<UploadedDocument> {
  const supabase = createAdminClient();
  const storagePath = `clients/${clientId}/${randomUUID()}.pdf`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DELIVERY_NOTE_PDFS_BUCKET)
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("uploaded_documents")
    .insert({
      client_id: clientId,
      storage_path: storagePath,
      original_filename: file.name,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as UploadedDocument;
}

export async function downloadDeliveryNoteDocument(storagePath: string): Promise<Uint8Array> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(DELIVERY_NOTE_PDFS_BUCKET).download(storagePath);
  if (error) throw error;
  return new Uint8Array(await data.arrayBuffer());
}

export async function updateUploadedDocument(id: string, patch: Partial<UploadedDocument>): Promise<UploadedDocument> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("uploaded_documents").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as UploadedDocument;
}
