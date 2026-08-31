"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClinic, updateClinic, updateMonthlyStatus } from "@/lib/supabase/queries";
import type { MonthlyStatus } from "@/types/database";

const clinicInput = (formData: FormData) => ({
  name: String(formData.get("name") ?? "").trim(),
  behandelaar: String(formData.get("behandelaar") ?? "").trim() || null,
  address: String(formData.get("address") ?? "").trim() || null,
  notes: String(formData.get("notes") ?? "").trim() || null,
});

export async function createClinicAction(formData: FormData) {
  const clinic = await createClinic({ ...clinicInput(formData), active: true });
  revalidatePath("/clinicas");
  revalidatePath("/clientes");
  redirect(`/clinicas/${clinic.id}`);
}

export async function updateClinicAction(id: string, formData: FormData) {
  await updateClinic(id, { ...clinicInput(formData), active: formData.has("active") });
  revalidatePath("/clinicas");
  revalidatePath(`/clinicas/${id}`);
  revalidatePath("/clientes");
}

export async function updateClinicMonthlyStatusAction(clinicId: string, noteIds: string[], status: MonthlyStatus) {
  await updateMonthlyStatus(noteIds, status);
  revalidatePath(`/clinicas/${clinicId}`);
}
