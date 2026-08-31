"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClient,
  updateClient,
  deleteClient,
  bulkInsertClients,
} from "@/lib/supabase/queries";
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
