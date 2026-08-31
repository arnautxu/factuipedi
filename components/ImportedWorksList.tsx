import Link from "next/link";
import type { ImportedWork } from "@/types/database";

const STATUS: Record<ImportedWork["status"], string> = {
  pending_review: "Pendiente de revisión",
  reviewed: "Revisado",
  converted: "Albarán creado",
};

export default function ImportedWorksList({ clientId, works }: { clientId: string; works: ImportedWork[] }) {
  if (!works.length) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] bg-[var(--tint)] px-5 py-3">
        <h2 className="text-sm font-bold text-[var(--navy)]">Trabajos importados</h2>
      </div>
      <ul className="divide-y divide-[var(--line-soft)]">
        {works.map((work) => (
          <li key={work.id} className="px-5 py-3">
            <Link href={`/clientes/${clientId}/importados/${work.id}`} className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--navy)]">{work.external_code || "Sin código externo"}</span>
                <span className="text-xs text-[var(--muted)]">{STATUS[work.status]}</span>
              </div>
              <p className="mt-1 truncate text-xs text-[var(--ink)]">{work.product_summary || "Sin productos extraídos"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Creado por {work.created_by} · Actualizado por {work.updated_by}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
