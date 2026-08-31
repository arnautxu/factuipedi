"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import type { Clinic, DeliveryNote, MonthlyStatus } from "@/types/database";
import { generateMonthlyInvoicePdf, downloadMonthlyInvoicePdf } from "@/lib/pdf/generateMonthlyInvoice";
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
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | MonthlyStatus>("all");
  const [pending, startTransition] = useTransition();
  const filteredNotes = useMemo(
    () => statusFilter === "all" ? notes : notes.filter((note) => note.monthly_status === statusFilter),
    [notes, statusFilter],
  );
  const groups = useMemo(() => Object.entries(filteredNotes.reduce<Record<string, DeliveryNote[]>>((all, note) => { const key = monthKey(note); (all[key] ??= []).push(note); return all; }, {})).sort(([a], [b]) => b.localeCompare(a)), [filteredNotes]);

  const exportRows = (key: string, monthNotes: DeliveryNote[], type: "xlsx" | "csv") => {
    const rows = monthNotes.map((note, index) => ({
      Orden: index + 1, Albarán: note.pakbonnummer || note.id.slice(0, 8), Fecha: note.uitgiftedatum || note.inkomstdatum || "",
      Paciente: note.naam_patient || "", Importe: note.total ?? 0, Estado: STATUS[note.monthly_status],
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Factura mensual");
    XLSX.writeFile(book, `factura-mensual-${key}-${clinic.name}`.replace(/[^\w.-]/g, "_") + `.${type}`, { bookType: type === "csv" ? "csv" : "xlsx" });
  };

  const downloadInvoice = async (key: string, monthNotes: DeliveryNote[]) => {
    setLoading(key); setError(null);
    try {
      const pdf = await generateMonthlyInvoicePdf({ clinic, period: monthLabel(key), notes: monthNotes });
      downloadMonthlyInvoicePdf(pdf, key, clinic.name);
    } catch (err) { setError(err instanceof Error ? err.message : "No se ha podido generar la factura mensual."); }
    finally { setLoading(null); }
  };

  if (!notes.length) return <p className="py-6 text-sm text-[var(--muted)]">Todavía no hay trabajos de esta clínica.</p>;
  return <div>
    <div className="flex items-center justify-end border-b border-[var(--line)] py-3">
      <label htmlFor="monthly-status-filter" className="mr-2 text-xs font-semibold text-[var(--muted)]">Filtrar por estado</label>
      <select
        id="monthly-status-filter"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as "all" | MonthlyStatus)}
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
      >
        <option value="all">Todos los estados</option>
        {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    {groups.length === 0 ? (
      <p className="py-6 text-sm text-[var(--muted)]">No hay trabajos con este estado.</p>
    ) : (
      <div className="divide-y divide-[var(--line)]">{groups.map(([key, monthNotes]) => {
    const total = monthNotes.reduce((sum, note) => sum + (note.total ?? 0), 0);
    return <section key={key} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold capitalize text-[var(--navy)]">{monthLabel(key)}</h3><p className="mt-1 text-xs text-[var(--muted)]">{monthNotes.length} {monthNotes.length === 1 ? "trabajo" : "trabajos"} · Total {euro(total)}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={loading !== null} onClick={() => downloadInvoice(key, monthNotes)}>{loading === key ? "Generando…" : "Descargar factura PDF"}</Button><Button variant="secondary" onClick={() => exportRows(key, monthNotes, "xlsx")}>Excel</Button><Button variant="secondary" onClick={() => exportRows(key, monthNotes, "csv")}>CSV</Button></div></div><div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)]"><table className="min-w-[680px] w-full text-sm"><thead><tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]"><th className="px-3 py-2">Albarán</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2">Estado</th></tr></thead><tbody>{monthNotes.map((note) => <tr key={note.id} className="border-b border-[var(--line-soft)] last:border-0"><td className="px-3 py-2 font-medium text-[var(--navy)]">{note.pakbonnummer || "Sin número"}</td><td className="px-3 py-2">{note.uitgiftedatum || note.inkomstdatum || "—"}</td><td className="px-3 py-2">{note.naam_patient || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{euro(note.total)}</td><td className="px-3 py-2"><select aria-label={`Estado de ${note.pakbonnummer || note.id}`} disabled={pending} value={note.monthly_status} onChange={(event) => startTransition(async () => { try { await updateClinicMonthlyStatusAction(clinic.id, [note.id], event.target.value as MonthlyStatus); } catch (err) { setError(err instanceof Error ? err.message : "No se ha podido actualizar el estado."); } })} className="rounded border border-[var(--line)] bg-white px-2 py-1 text-xs">{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table></div></section>;
      })}{error && <p role="alert" className="py-3 text-sm text-red-700">{error}</p>}</div>
    )}
  </div>;
}
