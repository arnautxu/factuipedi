"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        setError("Els albarans seleccionats no tenen línies.");
        return;
      }
      const bytes = await generateAlbaranPdf(header, lines);
      downloadPdf(bytes, "combinada");
      await saveCombinedInvoiceAction(clientId, header, lines);
      router.refresh();
    } catch (err) {
      setError("Error generant la factura combinada: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating(false);
    }
  };

  if (notes.length === 0) {
    return <p className="text-sm text-[var(--muted)] px-5 py-6">Encara no hi ha albarans per a aquest client.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-5 py-2.5 w-8"></th>
              <th className="px-5 py-2.5">Pakbonnummer</th>
              <th className="px-5 py-2.5">Data</th>
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
                      aria-label={`Seleccionar albarà ${n.pakbonnummer || n.id} per combinar`}
                      className="h-4 w-4 accent-[var(--navy)]"
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 font-medium">{n.pakbonnummer || "—"}</td>
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
            {selected.size} albarà{selected.size === 1 ? "" : "ns"} seleccionat{selected.size === 1 ? "" : "s"} per combinar
          </span>
          <Button disabled={generating || selected.size === 0} onClick={handleGenerate}>
            {generating ? "Generant…" : "Generar factura combinada"}
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
