import Link from "next/link";
import { notFound } from "next/navigation";
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
  return <div className="space-y-6"><div><h1 className="text-lg font-bold text-[var(--navy)]">{clinic.name}</h1><Link href="/clinicas" className="text-xs text-[var(--muted)] hover:underline">← Volver a clínicas</Link></div><ClinicForm clinic={clinic} action={updateClinicAction.bind(null, id)} submitLabel="Guardar cambios" /><Card className="px-5 py-3"><h2 className="text-sm font-bold text-[var(--navy)]">Albaranes de pacientes por mes</h2><ClinicMonthlyNotes clinicId={id} notes={notes} /></Card></div>;
}
