"use client";

import { useState } from "react";
import AlbaranForm from "@/components/AlbaranForm";
import LineItemsTable from "@/components/LineItemsTable";
import ClientPicker from "@/components/ClientPicker";
import type { CatalogEntry } from "@/types/catalog";
import type { Client } from "@/types/database";
import { emptyHeader, newLine, type LineItem } from "@/types/albaran";
import { generateAlbaranPdf, downloadPdf } from "@/lib/pdf/generateAlbaran";
import { saveAlbaranAction } from "@/app/(app)/albaran/actions";

export default function AlbaranNuevoClient({ catalog, clients }: { catalog: CatalogEntry[]; clients: Client[] }) {
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineItem[]>([newLine(), newLine(), newLine()]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reviewItems = catalog.filter((p) => p.priceText);

  const handleNew = () => {
    if (!confirm("¿Vaciar el formulario?")) return;
    setHeader(emptyHeader());
    setLines([newLine(), newLine(), newLine()]);
    setClientId(null);
    setMessage(null);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const bytes = await generateAlbaranPdf(header, lines);
      downloadPdf(bytes, header.pakbonnummer);
      try {
        await saveAlbaranAction(clientId, header, lines);
      } catch (saveErr) {
        setMessage(
          "El PDF s'ha descarregat, però no s'ha pogut desar a la base de dades: " +
            (saveErr instanceof Error ? saveErr.message : String(saveErr))
        );
      }
    } catch (err) {
      setMessage("Error generando el PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">Nou albarà</h1>
          <p className="text-xs text-[var(--muted)]">{catalog.length} productes al catàleg</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNew}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50"
          >
            Nuevo
          </button>
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, newLine()])}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50"
          >
            + Línia
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={handleGeneratePdf}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)] disabled:opacity-50"
          >
            {generating ? "Generant…" : "Descargar PDF"}
          </button>
        </div>
      </div>

      {message && (
        <div className="text-sm bg-white border border-[var(--line)] border-l-4 border-l-red-400 rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <b>Revisar:</b> {reviewItems.map((p) => `${p.code} (${p.priceText})`).join(", ")} — sin precio numérico; ponlo a mano en la línea.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-6 space-y-4">
        <ClientPicker
          clients={clients}
          selectedId={clientId}
          onSelect={(client, patch) => {
            setClientId(client?.id ?? null);
            setHeader((h) => ({ ...h, ...patch }));
          }}
        />

        <div className="pt-2 border-t border-[var(--line)]">
          <AlbaranForm header={header} onChange={setHeader} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 pt-4 border-t border-[var(--line)]">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Kleur</label>
            <input
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              value={header.kleur}
              onChange={(e) => setHeader({ ...header, kleur: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
              In opdracht gemaakt van
            </label>
            <input
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              value={header.in_opdracht}
              onChange={(e) => setHeader({ ...header, in_opdracht: e.target.value })}
            />
          </div>
        </div>
      </div>

      <LineItemsTable lines={lines} onChange={setLines} catalog={catalog} />
    </div>
  );
}
