"use client";

import { useState } from "react";
import type { DeliveryNote } from "@/types/database";
import { generateAlbaranPdf, downloadPdf } from "@/lib/pdf/generateAlbaran";
import { getClinicCombinedLinesAction, saveClinicCombinedInvoiceAction } from "@/app/(app)/clinicas/actions";
import { Button } from "@/components/ui/Button";

function monthKey(note: DeliveryNote) {
  const value = note.uitgiftedatum || note.inkomstdatum || "";
  const iso = value.match(/^(\d{4})-(\d{1,2})/);
  const european = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}`;
  if (european) return `${european[3]}-${european[2].padStart(2, "0")}`;
  return "sin-fecha";
}

export default function ClinicMonthlyNotes({ clinicId, notes }: { clinicId: string; notes: DeliveryNote[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groups = Object.entries(notes.reduce<Record<string, DeliveryNote[]>>((all, note) => { const key = monthKey(note); (all[key] ??= []).push(note); return all; }, {})).sort(([a], [b]) => b.localeCompare(a));
  const download = async (key: string, monthNotes: DeliveryNote[]) => {
    setLoading(key); setError(null);
    try {
      const { header, lines } = await getClinicCombinedLinesAction(clinicId, monthNotes.map((note) => note.id));
      if (!lines.length) throw new Error("Los albaranes de este mes no tienen líneas.");
      const pdf = await generateAlbaranPdf(header, lines);
      await saveClinicCombinedInvoiceAction(clinicId, header, lines);
      downloadPdf(pdf, `clinica-${key}`);
    } catch (err) { setError(err instanceof Error ? err.message : "No se ha podido generar el albarán."); }
    finally { setLoading(null); }
  };
  if (!groups.length) return <p className="py-6 text-sm text-[var(--muted)]">Todavía no hay albaranes de pacientes asociados a esta clínica.</p>;
  return <div className="divide-y divide-[var(--line)]">{groups.map(([key, monthNotes]) => <div key={key} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold text-[var(--navy)]">{key === "sin-fecha" ? "Sin fecha" : new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`))}</p><p className="mt-1 text-xs text-[var(--muted)]">{monthNotes.length} {monthNotes.length === 1 ? "albarán" : "albaranes"} de pacientes</p></div><Button variant="secondary" disabled={loading !== null} onClick={() => download(key, monthNotes)}>{loading === key ? "Generando…" : "Descargar conjunto"}</Button></div>)}{error && <p role="alert" className="py-3 text-sm text-red-700">{error}</p>}</div>;
}
