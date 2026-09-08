"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeliveryNote, DeliveryNoteSource } from "@/types/database";

import { getCombinedLinesAction, saveCombinedInvoiceAction } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/Button";

const eur = (value: number | null) =>
  value == null ? "—" : value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const sourceLabel: Record<DeliveryNoteSource, string> = {
  created: "Creado aquí",
  uploaded: "Importado",
  combined: "Factura combinada",
};

type NoteGroup = {
  key: string;
  label: string;
  locations: { key: string; label: string; notes: DeliveryNote[] }[];
};

function parseNoteDate(note: DeliveryNote) {
  const value = note.uitgiftedatum || note.inkomstdatum;
  if (!value) return null;
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const europeanMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parts = isoMatch ? [isoMatch[3], isoMatch[2], isoMatch[1]] : europeanMatch?.slice(1);
  if (!parts) return null;
  const [day, month, year] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function groupNotes(notes: DeliveryNote[]): NoteGroup[] {
  const months = new Map<string, { label: string; time: number; locations: Map<string, { label: string; notes: DeliveryNote[] }> }>();
  notes.forEach((note) => {
    const date = parseNoteDate(note);
    const monthKey = date ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` : "undated";
    const monthLabel = date
      ? new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(date)
      : "Sin fecha";
    const locationLabel = note.klant_regel2?.trim() || "Sin ubicación indicada";
    const locationKey = locationLabel.toLocaleLowerCase("es-ES");
    if (!months.has(monthKey)) months.set(monthKey, { label: monthLabel, time: date?.getTime() ?? -1, locations: new Map() });
    const month = months.get(monthKey)!;
    if (!month.locations.has(locationKey)) month.locations.set(locationKey, { label: locationLabel, notes: [] });
    month.locations.get(locationKey)!.notes.push(note);
  });

  return [...months.entries()]
    .sort(([, a], [, b]) => b.time - a.time)
    .map(([key, month]) => ({
      key,
      label: month.label.charAt(0).toUpperCase() + month.label.slice(1),
      locations: [...month.locations.entries()]
        .sort(([, a], [, b]) => a.label.localeCompare(b.label, "es"))
        .map(([locationKey, location]) => ({ key: locationKey, ...location })),
    }));
}

export default function DeliveryNotesTable({
  clientId,
  notes,
  originalDocumentUrls = {},
}: {
  clientId: string;
  notes: DeliveryNote[];
  originalDocumentUrls?: Record<string, string>;
}) {
  const router = useRouter();
  const combinable = notes.filter((note) => note.source !== "combined");
  const [selected, setSelected] = useState<Set<string>>(new Set(combinable.map((note) => note.id)));
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groups = groupNotes(notes);

  const toggle = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async (invoiceNotes: DeliveryNote[], key: string) => {
    if (invoiceNotes.length === 0) return;
    setGeneratingKey(key);
    setError(null);
    try {
      const { header, lines, clinicId } = await getCombinedLinesAction(
        clientId,
        invoiceNotes.map((note) => note.id),
      );
      if (lines.length === 0) throw new Error("Los albaranes seleccionados no tienen líneas.");

      const { generateAlbaranPdf, downloadPdf } = await import("@/lib/pdf/generateAlbaran");
      const bytes = await generateAlbaranPdf(header, lines);
      await saveCombinedInvoiceAction(clientId, clinicId, header, lines);
      downloadPdf(bytes, "factura");
      router.refresh();
    } catch (err) {
      setError("Error al generar la factura del paciente: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGeneratingKey(null);
    }
  };

  if (notes.length === 0) return <p className="px-5 py-8 text-sm text-[var(--muted)]">Todavía no hay albaranes para este paciente.</p>;

  return (
    <div>
      <div className="divide-y divide-[var(--line)]">
        {groups.map((month) => (
          <section key={month.key} aria-labelledby={`month-${month.key}`} className="px-4 py-5 sm:px-5">
            {(() => {
              const monthNoteIds = month.locations
                .flatMap((location) => location.notes)
                .filter((note) => note.source !== "combined")
                .map((note) => note.id);

              return (
                <div className="flex items-center justify-between gap-3">
                  <h3 id={`month-${month.key}`} className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">{month.label}</h3>
                  {monthNoteIds.length > 0 && (
                    <Button
                      variant="secondary"
                      disabled={generatingKey !== null}
                      onClick={() => handleGenerate(month.locations.flatMap((location) => location.notes).filter((note) => note.source !== "combined"), month.key)}
                      className="px-2.5 py-1.5 text-xs"
                    >
                      {generatingKey === month.key ? "Generando…" : "Generar factura"}
                    </Button>
                  )}
                </div>
              );
            })()}
            <div className="mt-3 space-y-4">
              {month.locations.map((location) => (
                <div key={location.key} className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                  <div className="border-b border-[var(--line-soft)] bg-[var(--tint)] px-3 py-2.5 sm:px-4">
                    <p className="text-xs font-semibold leading-5 text-[var(--ink)]">{location.label}</p>
                  </div>
                  <ul className="divide-y divide-[var(--line-soft)]" aria-label={`Albaranes en ${location.label}`}>
                    {location.notes.map((note) => {
                      const selectable = note.source !== "combined";
                      const originalDocumentUrl = originalDocumentUrls[note.id];
                      return (
                        <li key={note.id} className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-50 sm:px-4">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {selectable && <input type="checkbox" checked={selected.has(note.id)} onChange={() => toggle(note.id)} aria-label={`Seleccionar albarán ${note.pakbonnummer || note.id} para combinar`} className="h-4 w-4 rounded border-[var(--line)] accent-[var(--navy)]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link href={`/clientes/${clientId}/albaran/${note.id}`} className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                              <div className="flex min-w-0 items-center justify-between gap-3">
                                <span className="truncate text-sm font-semibold text-[var(--navy)] group-hover:underline">{note.pakbonnummer || "Albarán sin número"}</span>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--ink)]">{eur(note.total)}</span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[var(--muted)]"><span>{note.uitgiftedatum || note.inkomstdatum || "Sin fecha"}</span><span aria-hidden="true">·</span><span>{sourceLabel[note.source]}</span></div>
                            </Link>
                            {originalDocumentUrl && (
                              <a
                                href={originalDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block rounded text-xs font-semibold text-[var(--navy)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                              >
                                Ver albarán original
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {combinable.length > 0 && (
        <div className="sticky bottom-3 mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:mx-5 sm:px-4">
          <span aria-live="polite" className="text-xs leading-5 text-[var(--muted)]">{selected.size} {selected.size === 1 ? "albarán seleccionado" : "albaranes seleccionados"}</span>
          <Button
            disabled={generatingKey !== null || selected.size === 0}
            onClick={() => {
              const selectedNotes = combinable.filter((note) => selected.has(note.id));
              const selectedMonths = new Set(selectedNotes.map((note) => parseNoteDate(note)?.toISOString().slice(0, 7) ?? "undated"));
              if (selectedMonths.size > 1) {
                setError("Selecciona albaranes de un único mes para generar una factura mensual.");
                return;
              }
              handleGenerate(selectedNotes, "selection");
            }}
            className="shrink-0"
          >
            {generatingKey === "selection" ? "Generando…" : "Generar factura"}
          </Button>
        </div>
      )}
      {error && <p role="alert" className="px-5 py-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
