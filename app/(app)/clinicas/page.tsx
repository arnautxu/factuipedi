import Link from "next/link";
import { getClinics } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/Card";
export default async function ClinicasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const archived = (await searchParams).estado === "archivadas";
  const all = await getClinics(true);
  const clinics = all.filter((clinic) => archived ? clinic.active === false : clinic.active !== false);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-lg font-bold text-[var(--navy)]">Clínicas</h1><Link href="/clinicas/nueva" className="inline-flex min-h-11 items-center rounded-lg bg-[var(--navy)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--navy-deep)]">Nueva clínica</Link></div>
    <nav aria-label="Estado de las clínicas" className="flex flex-wrap gap-2">{[{ label: "Activas", href: "/clinicas", selected: !archived }, { label: "Archivadas", href: "/clinicas?estado=archivadas", selected: archived }].map((tab) => <Link key={tab.label} href={tab.href} aria-current={tab.selected ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold ${tab.selected ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:bg-slate-50"}`}>{tab.label}</Link>)}</nav>
    <Card className="overflow-hidden">{clinics.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted)]">{archived ? "No hay clínicas archivadas." : "No hay clínicas activas. Crea una clínica o restaura una archivada."}</p> : <ul className="divide-y divide-[var(--line-soft)]">{clinics.map((clinic) => <li key={clinic.id}><Link href={`/clinicas/${clinic.id}`} className="block break-words px-5 py-4 hover:bg-slate-50"><p className="font-semibold text-[var(--navy)]">{clinic.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{[clinic.behandelaar, clinic.address].filter(Boolean).join(" · ") || "Sin datos adicionales"}</p></Link></li>)}</ul>}</Card>
  </div>;
}
