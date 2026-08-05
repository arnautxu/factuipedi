"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, updateClient, deleteClient } from "@/lib/supabase/queries";

export async function createClientAction(formData: FormData) {
  const client = await createClient({
    naam_patient: String(formData.get("naam_patient") ?? "").trim() || null,
    geboortedatum: String(formData.get("geboortedatum") ?? "").trim() || null,
    behandelaar: String(formData.get("behandelaar") ?? "").trim() || null,
    klant_regel2: String(formData.get("klant_regel2") ?? "").trim() || null,
    in_opdracht: String(formData.get("in_opdracht") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/clientes");
  redirect(`/clientes/${client.id}`);
}

export async function updateClientAction(id: string, formData: FormData) {
  await updateClient(id, {
    naam_patient: String(formData.get("naam_patient") ?? "").trim() || null,
    geboortedatum: String(formData.get("geboortedatum") ?? "").trim() || null,
    behandelaar: String(formData.get("behandelaar") ?? "").trim() || null,
    klant_regel2: String(formData.get("klant_regel2") ?? "").trim() || null,
    in_opdracht: String(formData.get("in_opdracht") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function deleteClientAction(id: string) {
  await deleteClient(id);
  revalidatePath("/clientes");
  redirect("/clientes");
}
