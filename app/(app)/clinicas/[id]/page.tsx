import Link from "next/link";
import { notFound } from "next/navigation";
import ClinicManagement from "@/components/ClinicManagement";
import { createAdminClient } from "@/lib/supabase/admin";
import ClinicForm from "@/components/ClinicForm";
import ClinicMonthlyNotes from "@/components/ClinicMonthlyNotes";
import { Card } from "@/components/ui/Card";
import { getClinic, getDeliveryNotesForClinic } from "@/lib/supabase/queries";
import { updateClinicAction } from "../actions";

export default async function ClinicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getClinic(id);
  if (!clinic) notFound();
  const notes = await getDeliveryNotesForClinic(id);
  const dependencies = await Promise.all(["clients", "delivery_notes", "imported_works"].map((table) => createAdminClient().from(table).select("id", { count: "exact", head: true }).eq("clinic_id", id)));
  if (dependencies.some((result) => result.error)) throw new Error("No se ha podido comprobar el historial de la clínica.");
  const hasHistory = dependencies.some((result) => (result.count ?? 0) > 0);
  return <div className="space-y-6"><div><h1 className="text-lg font-bold text-[var(--navy)]">{clinic.name}</h1><Link href="/clinicas" className="text-xs text-[var(--muted)] hover:underline">← Volver a clínicas</Link></div><ClinicForm clinic={clinic} action={updateClinicAction.bind(null, id)} submitLabel="Guardar cambios" /><ClinicManagement clinic={clinic} hasHistory={hasHistory} /><Card className="px-4 py-3 sm:px-5"><h2 className="text-sm font-bold text-[var(--navy)]">Facturación mensual</h2><ClinicMonthlyNotes clinic={clinic} notes={notes} /></Card></div>;
}
