import Link from "next/link";
import { getClinics } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/Card";

export default async function ClinicasPage() {
  const clinics = await getClinics();
  return <div><div className="mb-4 flex items-center justify-between gap-3"><h1 className="text-lg font-bold text-[var(--navy)]">Clínicas</h1><Link href="/clinicas/nueva" className="rounded-lg bg-[var(--navy)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--navy-deep)]">Nueva clínica</Link></div><Card className="overflow-hidden">{clinics.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted)]">Da de alta la primera clínica para poder asociar pacientes.</p> : <ul className="divide-y divide-[var(--line-soft)]">{clinics.map((clinic) => <li key={clinic.id}><Link href={`/clinicas/${clinic.id}`} className="block px-5 py-4 transition-colors hover:bg-slate-50"><p className="font-semibold text-[var(--navy)]">{clinic.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{[clinic.behandelaar, clinic.address].filter(Boolean).join(" · ") || "Sin datos adicionales"}</p></Link></li>)}</ul>}</Card></div>;
}
