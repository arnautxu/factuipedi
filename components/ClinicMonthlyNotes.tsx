"use client";

import { useMemo, useRef, useState } from "react";
import { ActionFeedback, type Feedback } from "@/components/ui/ActionFeedback";
import type { Clinic, DeliveryNote, MonthlyStatus } from "@/types/database";

import { updateClinicMonthlyStatusAction } from "@/app/(app)/clinicas/actions";
import { Button } from "@/components/ui/Button";

const STATUS: Record<MonthlyStatus, string> = { pending: "Pendiente", reviewed: "Revisado", prepared: "Preparado", invoiced: "Facturado" };
const euro = (value: number | null) => (value ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

function monthKey(note: DeliveryNote) {
  const value = note.uitgiftedatum || note.inkomstdatum || "";
  const iso = value.match(/^(\d{4})-(\d{1,2})/);
  const european = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}`;
  if (european) return `${european[3]}-${european[2].padStart(2, "0")}`;
  return "sin-fecha";
}

function monthLabel(key: string) {
  if (key === "sin-fecha") return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
}

export default function ClinicMonthlyNotes({ clinic, notes }: { clinic: Clinic; notes: DeliveryNote[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  const [message, setMessage] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | MonthlyStatus>("all");
  const groups = useMemo(() => Object.entries(notes.reduce<Record<string, DeliveryNote[]>>((all, note) => {
    (all[monthKey(note)] ??= []).push(note); return all;
  }, {})).sort(([a], [b]) => b.localeCompare(a)), [notes]);
  const run = async (key: string, action: () => Promise<string>) => {
    if (lock.current) return;
    lock.current = true; setBusy(key); setMessage(null);
    try { setMessage({ type: "success", text: await action() }); }
    catch { setMessage({ type: "error", text: "No se ha podido completar la acción. Comprueba la conexión y vuelve a intentarlo." }); }
    finally { lock.current = false; setBusy(null); }
  };
  const exportRows = (key: string, rows: DeliveryNote[], type: "xlsx" | "csv") => run(`${key}-${type}`, async () => {
    const XLSX = await import("xlsx");
    const scope = statusFilter === "all" ? "Mes completo" : `Filtrado: ${STATUS[statusFilter]}`;
    const sheet = XLSX.utils.json_to_sheet(rows.map((note, index) => ({
      Alcance: scope, Periodo: monthLabel(key), Orden: index + 1, Albarán: note.pakbonnummer || note.id.slice(0, 8), Fecha: note.uitgiftedatum || note.inkomstdatum || "", Paciente: note.naam_patient || "", Importe: note.total ?? 0, Estado: STATUS[note.monthly_status],
    })));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Trabajos");
    XLSX.writeFile(book, `trabajos-${key}-${statusFilter}-${clinic.name}`.replace(/[^\w.-]/g, "_") + `.${type}`, { bookType: type });
    return `${rows.length} trabajos preparados. Descarga ${type.toUpperCase()} iniciada.`;
  });
  const downloadInvoice = (key: string, monthNotes: DeliveryNote[]) => run(`${key}-pdf`, async () => {
    const { generateMonthlyInvoicePdf, downloadMonthlyInvoicePdf } = await import("@/lib/pdf/generateMonthlyInvoice");
    const pdf = await generateMonthlyInvoicePdf({ clinic, period: monthLabel(key), notes: monthNotes });
    downloadMonthlyInvoicePdf(pdf, key, clinic.name);
    return `Factura del mes completo preparada (${monthNotes.length} trabajos). Descarga iniciada.`;
  });
  const updateStatus = (note: DeliveryNote, status: MonthlyStatus) => run(note.id, async () => {
    await updateClinicMonthlyStatusAction(clinic.id, [note.id], status);
    return `Albarán ${note.pakbonnummer || "sin número"}: ${STATUS[status]}.${statusFilter !== "all" && statusFilter !== status ? " Ya no aparece porque no coincide con el filtro." : ""}`;
  });
  if (!notes.length) return <p className="py-6 text-sm text-[var(--muted)]">Todavía no hay trabajos de esta clínica.</p>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 pt-4"><label htmlFor="monthly-status-filter" className="text-sm font-semibold text-[var(--muted)]">Mostrar trabajos</label><select id="monthly-status-filter" value={statusFilter} disabled={busy !== null} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setMessage(null); }} className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <ActionFeedback message={message} />
    <div className="divide-y divide-[var(--line)]">{groups.map(([key, monthNotes]) => {
      const visible = monthNotes.filter((note) => statusFilter === "all" || note.monthly_status === statusFilter);
      return <section key={key} className="space-y-4 py-5" aria-label={monthLabel(key)}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold capitalize text-[var(--navy)]">{monthLabel(key)}</h3></div><Button variant="secondary" disabled={busy !== null || key === "sin-fecha"} onClick={() => downloadInvoice(key, monthNotes)}>{busy === `${key}-pdf` ? "Generando…" : "Descargar factura del mes completo"}</Button></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy !== null || !visible.length} onClick={() => exportRows(key, visible, "xlsx")}>{busy === `${key}-xlsx` ? "Generando…" : "Excel"}</Button><Button variant="secondary" disabled={busy !== null || !visible.length} onClick={() => exportRows(key, visible, "csv")}>{busy === `${key}-csv` ? "Generando…" : "CSV"}</Button></div></div>
        {!visible.length ? <p className="py-3 text-sm text-[var(--muted)]">No hay trabajos con este estado en este mes.</p> : <ul className="divide-y divide-[var(--line-soft)] rounded-xl border border-[var(--line)]">{visible.map((note) => <li key={note.id} className="grid grid-cols-1 items-center gap-3 px-3 py-3 sm:grid-cols-[1fr_auto_auto]"><div className="min-w-0"><p className="break-words font-medium text-[var(--navy)]">{note.pakbonnummer || "Sin número"} · {note.naam_patient || "Sin paciente"}</p><p className="mt-1 text-sm text-[var(--muted)]">{note.uitgiftedatum || note.inkomstdatum || "Sin fecha"}</p></div><span className="text-sm tabular-nums">{euro(note.total)}</span><label className="flex items-center gap-2 text-sm"><span>{busy === note.id ? "Guardando…" : "Estado"}</span><select aria-label={`Estado de ${note.pakbonnummer || note.id}`} value={note.monthly_status} disabled={busy !== null} onChange={(event) => updateStatus(note, event.target.value as MonthlyStatus)} className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-2 py-2">{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></li>)}</ul>}
      </section>;
    })}</div>
  </div>;
}
