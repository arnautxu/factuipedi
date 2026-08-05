import Link from "next/link";
import { getClients } from "@/lib/supabase/queries";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = await getClients(q);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-lg font-bold text-[var(--navy)]">Clients</h1>
        <Link
          href="/clientes/nuevo"
          className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)]"
        >
          + Nou client
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cerca per nom, doctor o clínica…"
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
      </form>

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden">
        {clients.length === 0 ? (
          <p className="text-sm text-[var(--muted)] px-5 py-6">Encara no hi ha clients registrats.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
                <th className="px-5 py-2.5">Pacient</th>
                <th className="px-5 py-2.5">Behandelaar</th>
                <th className="px-5 py-2.5">Kliniek / adres</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line-soft,#eef2f8)] last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-2.5">
                    <Link href={`/clientes/${c.id}`} className="font-medium text-[var(--navy)] hover:underline">
                      {c.naam_patient || "(sense nom)"}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-[var(--muted)]">{c.behandelaar || "—"}</td>
                  <td className="px-5 py-2.5 text-[var(--muted)]">{c.klant_regel2 || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
