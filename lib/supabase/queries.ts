import "server-only";
import { createAdminClient } from "./admin";
import type { Client, DeliveryNote, DeliveryNoteLine, CatalogItem } from "@/types/database";
import type { AlbaranHeader, LineItem } from "@/types/albaran";
import type { EmbeddedCatalogItem } from "@/lib/catalog/embeddedCatalog";

export async function getCatalogItems(): Promise<CatalogItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("active", true)
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}

export async function replaceCatalogItems(items: EmbeddedCatalogItem[]): Promise<number> {
  if (!items.length) return 0;
  const supabase = createAdminClient();
  const rows = items.map((item) => ({
    cat: item.cat,
    code: item.code,
    description: item.description,
    price: item.price,
    price_text: item.price_text,
    active: true,
  }));
  const { error } = await supabase.from("catalog_items").upsert(rows, { onConflict: "code" });
  if (error) throw error;
  return items.length;
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
  source: DeliveryNote["source"] = "created"
): Promise<DeliveryNote> {
  const supabase = createAdminClient();
  const filled = lines.filter((l) => l.code || l.description);
  const total = filled.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0);

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
