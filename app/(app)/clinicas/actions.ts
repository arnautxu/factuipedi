"use server";
import { revalidatePath } from "next/cache";
import { createClinic, updateClinic, updateMonthlyStatus } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth/require-session";
import type { MonthlyStatus } from "@/types/database";
import type { ActionResult } from "@/lib/ui/action-result";

const clinicInput = (data: FormData) => ({
  name: String(data.get("name") ?? "").trim(),
  behandelaar: String(data.get("behandelaar") ?? "").trim() || null,
  address: String(data.get("address") ?? "").trim() || null,
  notes: String(data.get("notes") ?? "").trim() || null,
});
function refreshClinics(id?: string) {
  revalidatePath("/clinicas"); revalidatePath("/clientes"); revalidatePath("/albaran/nuevo");
  if (id) revalidatePath(`/clinicas/${id}`);
}
export async function createClinicAction(data: FormData): Promise<ActionResult> {
  await requireSession();
  const input = clinicInput(data);
  if (!input.name) return { error: "Escribe el nombre de la clínica.", field: "name" };
  try {
    const clinic = await createClinic({ ...input, active: true }); refreshClinics();
    return { message: "Clínica creada.", redirectTo: `/clinicas/${clinic.id}` };
  } catch (error) { return { error: (error as { code?: string }).code === "23505" ? "Ya existe una clínica con este nombre." : "No se ha podido crear la clínica. Vuelve a intentarlo.", field: "name" }; }
}
export async function updateClinicAction(id: string, data: FormData): Promise<ActionResult> {
  await requireSession();
  const input = clinicInput(data);
  if (!input.name) return { error: "Escribe el nombre de la clínica.", field: "name" };
  try { await updateClinic(id, input); refreshClinics(id); return { message: "Cambios de la clínica guardados." }; }
  catch (error) { return { error: (error as { code?: string }).code === "23505" ? "Ya existe una clínica con este nombre." : "No se han podido guardar los cambios. Vuelve a intentarlo.", field: "name" }; }
}
export async function manageClinicAction(id: string, operation: "delete" | "archive" | "restore"): Promise<ActionResult> {
  await requireSession();
  if (!["delete", "archive", "restore"].includes(operation)) return { error: "Acción no válida." };
  const { data, error } = await createAdminClient().rpc("manage_clinic", { target_id: id, operation });
  if (error) return { error: "No se ha podido completar la acción. Vuelve a intentarlo." };
  if (data === "has_history") return { error: "Esta clínica tiene pacientes o historial. Archívala para conservarlos." };
  if (data === "not_found") return { error: "La clínica ya no existe. Vuelve al listado." };
  refreshClinics(id);
  return { message: operation === "delete" ? "Clínica eliminada." : operation === "archive" ? "Clínica archivada. El historial se conserva." : "Clínica restaurada.", redirectTo: operation === "delete" ? "/clinicas" : undefined };
}
export async function updateClinicMonthlyStatusAction(clinicId: string, noteIds: string[], status: MonthlyStatus) {
  await requireSession();
  if (!["pending", "reviewed", "prepared", "invoiced"].includes(status) || !noteIds.length) throw new Error("Estado no válido.");
  const { data, error } = await createAdminClient().from("delivery_notes").select("id").eq("clinic_id", clinicId).in("id", noteIds);
  if (error || data?.length !== new Set(noteIds).size) throw new Error("No se han podido comprobar los trabajos de esta clínica.");
  await updateMonthlyStatus(noteIds, status); revalidatePath(`/clinicas/${clinicId}`);
}
