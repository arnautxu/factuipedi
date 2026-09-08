import Link from "next/link";
import { getClients, getClinics } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/Card";
import { ClientsToolbar } from "@/components/ClientsToolbar";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = await getClients(q);
  const clinics = await getClinics(true);
  const clinicNames = new Map(clinics.map((clinic) => [clinic.id, clinic.name]));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-lg font-bold text-[var(--navy)]">Pacientes</h1>
        <ClientsToolbar clients={clients} />
      </div>

      <form className="mb-4">
        <label htmlFor="client-search" className="sr-only">
          Buscar un paciente
        </label>
        <input
          id="client-search"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, doctor o clínica…"
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
        />
      </form>

      <Card className="overflow-hidden">
        {clients.length === 0 ? (
          <p className="text-sm text-[var(--muted)] px-5 py-6">Todavía no hay pacientes registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
                  <th className="px-5 py-2.5">Paciente</th>
                  <th className="px-5 py-2.5">Clínica</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--line-soft)] transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium text-[var(--navy)] rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      >
                        {c.naam_patient || c.behandelaar || "(sin nombre)"}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-[var(--muted)]">{(c.clinic_id && clinicNames.get(c.clinic_id)) || "Sin clínica"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
