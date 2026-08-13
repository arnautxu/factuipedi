"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DeliveryNote } from "@/types/database";
import { generateAlbaranPdf, downloadPdf } from "@/lib/pdf/generateAlbaran";
import { getCombinedLinesAction, saveCombinedInvoiceAction } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/Button";

const eur = (v: number | null) => (v == null ? "—" : v.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }));

export default function DeliveryNotesTable({ clientId, notes }: { clientId: string; notes: DeliveryNote[] }) {
  const router = useRouter();
  const combinable = notes.filter((n) => n.source !== "combined");
  const [selected, setSelected] = useState<Set<string>>(new Set(combinable.map((n) => n.id)));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const { header, lines } = await getCombinedLinesAction(clientId, [...selected]);
      if (!lines.length) {
        setError("Los albaranes seleccionados no tienen líneas.");
        return;
      }
      const bytes = await generateAlbaranPdf(header, lines);
      // Es desa abans de descarregar: a Safari mòbil, la descàrrega d'un PDF
      // pot interrompre una petició de xarxa concurrent en curs.
      await saveCombinedInvoiceAction(clientId, header, lines);
      downloadPdf(bytes, "combinada");
      router.refresh();
    } catch (err) {
      setError("Error al generar la factura combinada: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating(false);
    }
  };

  if (notes.length === 0) {
    return <p className="text-sm text-[var(--muted)] px-5 py-6">Todavía no hay albaranes para este cliente.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-5 py-2.5 w-8"></th>
              <th className="px-5 py-2.5">Pakbonnummer</th>
              <th className="px-5 py-2.5">Fecha</th>
              <th className="px-5 py-2.5">Origen</th>
              <th className="px-5 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr
                key={n.id}
                className="border-b border-[var(--line-soft)] transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-2.5">
                  {n.source !== "combined" && (
                    <input
                      type="checkbox"
                      checked={selected.has(n.id)}
                      onChange={() => toggle(n.id)}
                      aria-label={`Seleccionar albarán ${n.pakbonnummer || n.id} para combinar`}
                      className="h-4 w-4 accent-[var(--navy)]"
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 font-medium">
                  <Link
                    href={`/clientes/${clientId}/albaran/${n.id}`}
                    className="rounded text-[var(--navy)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  >
                    {n.pakbonnummer || "(sin número)"}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-[var(--muted)]">{n.uitgiftedatum || "—"}</td>
                <td className="px-5 py-2.5 text-[var(--muted)] capitalize">{n.source}</td>
                <td className="px-5 py-2.5 text-right">{eur(n.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {combinable.length > 0 && (
        <div className="px-5 py-3 border-t border-[var(--line)] flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-[var(--muted)]">
            {selected.size} {selected.size === 1 ? "albarán seleccionado" : "albaranes seleccionados"} para combinar
          </span>
          <Button disabled={generating || selected.size === 0} onClick={handleGenerate}>
            {generating ? "Generando…" : "Generar factura combinada"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 px-5 py-3">
          {error}
        </p>
      )}
    </div>
  );
}
