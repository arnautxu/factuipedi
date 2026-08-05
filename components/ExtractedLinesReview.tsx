"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import type { LineItem } from "@/types/albaran";
import { saveExtractedNoteAction } from "@/app/(app)/clientes/[id]/subir/actions";

export default function ExtractedLinesReview({
  clientId,
  documentId,
  extracted,
}: {
  clientId: string;
  documentId: string;
  extracted: ExtractedDeliveryNote;
}) {
  const router = useRouter();
  const [patientName, setPatientName] = useState(extracted.patient_name);
  const [date, setDate] = useState(extracted.date);
  const [lines, setLines] = useState<LineItem[]>(
    extracted.lines.map((l) => ({ code: l.code, description: l.description, qty: l.qty, price: l.price, priceText: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLine = (i: number, patch: Partial<LineItem>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    setLines(next);
  };

  const total = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await saveExtractedNoteAction(clientId, documentId, patientName, date, lines);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push(`/clientes/${clientId}`);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
        Revisa i corregeix les línies extretes per IA abans de desar-les — la precisió pot variar segons el disseny del document original.
      </div>

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
            Nom del pacient
          </label>
          <input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Data</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-3 py-2 w-24">Cód</th>
              <th className="px-3 py-2">Descripció</th>
              <th className="px-3 py-2 w-20">Qty</th>
              <th className="px-3 py-2 w-28">Preu</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-[var(--line-soft,#eef2f8)] last:border-0">
                <td className="px-3 py-1.5">
                  <input
                    value={l.code}
                    onChange={(e) => setLine(i, { code: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={l.qty}
                    onChange={(e) => setLine(i, { qty: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={l.price}
                    onChange={(e) => setLine(i, { price: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500 text-lg leading-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">
                  No s&apos;ha extret cap línia. Afegeix-les manualment si cal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLines([...lines, { code: "", description: "", qty: "", price: "", priceText: "" }])}
          className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50"
        >
          + Línia
        </button>
        <span className="font-bold text-[var(--navy)] text-base">
          {total.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
        </span>
      </div>

      {error && (
        <div className="text-sm bg-white border border-[var(--line)] border-l-4 border-l-red-400 rounded-xl px-4 py-3">{error}</div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)] disabled:opacity-50"
      >
        {saving ? "Desant…" : "Desar a la fitxa del client"}
      </button>
    </div>
  );
}
