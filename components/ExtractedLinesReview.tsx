"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import type { LineItem } from "@/types/albaran";
import { saveExtractedNoteAction } from "@/app/(app)/clientes/[id]/subir/actions";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    extracted.lines.map((l) => ({
      code: l.code,
      description: l.description,
      qty: l.qty,
      price: l.price,
      priceText: "",
      discount: l.discount,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // See LineItemsTable.tsx for why a parallel id array is used for stable keys.
  const idsRef = useRef<number[]>(lines.map((_, i) => i));
  const nextIdRef = useRef(lines.length);

  const setLine = (i: number, patch: Partial<LineItem>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    setLines(next);
  };

  const addLine = () => {
    idsRef.current.push(nextIdRef.current++);
    setLines((ls) => [...ls, { code: "", description: "", qty: "", price: "", priceText: "", discount: "" }]);
  };

  const removeLine = (i: number) => {
    idsRef.current.splice(i, 1);
    setLines((ls) => ls.filter((_, idx) => idx !== i));
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

      {extracted.discount && (
        <div role="status" className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <b>Descompte detectat al document:</b> {extracted.discount}. Ajusta els preus manualment si cal — el
          descompte no s&apos;aplica automàticament.
        </div>
      )}

      <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
        <Field id="extracted-patient-name" label="Nom del pacient" value={patientName} onChange={setPatientName} />
        <Field id="extracted-date" label="Data" value={date} onChange={setDate} />
      </Card>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-3 py-2 w-24">Cód</th>
              <th className="px-3 py-2">Descripció</th>
              <th className="px-3 py-2 w-20">Qty</th>
              <th className="px-3 py-2 w-28">Preu</th>
              <th className="px-3 py-2 w-24">Descompte</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr
                key={idsRef.current[i]}
                className="animate-fade-slide-in border-b border-[var(--line-soft)] transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-3 py-1.5">
                  <input
                    aria-label="Cód"
                    value={l.code}
                    onChange={(e) => setLine(i, { code: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    aria-label="Descripció"
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    aria-label="Qty"
                    value={l.qty}
                    onChange={(e) => setLine(i, { qty: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    aria-label="Preu"
                    value={l.price}
                    onChange={(e) => setLine(i, { price: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    aria-label="Descompte"
                    placeholder="—"
                    value={l.discount}
                    onChange={(e) => setLine(i, { discount: e.target.value })}
                    className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm text-amber-700 outline-none transition-colors focus:border-[var(--focus)]"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    aria-label="Eliminar línia"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-[var(--muted)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--muted)]">
                  No s&apos;ha extret cap línia. Afegeix-les manualment si cal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={addLine}>
          + Línia
        </Button>
        <span className="font-bold text-[var(--navy)] text-base">
          {total.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
        </span>
      </div>

      {error && (
        <div role="alert" className="text-sm bg-white border border-[var(--line)] border-l-4 border-l-red-400 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button disabled={saving} onClick={handleSave}>
        {saving ? "Desant…" : "Desar a la fitxa del client"}
      </Button>
    </div>
  );
}
