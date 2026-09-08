"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AlbaranForm from "@/components/AlbaranForm";
import LineItemsTable from "@/components/LineItemsTable";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { applyDiscountToAmount, lineTotal } from "@/lib/albaran/pricing";
import type { CatalogEntry } from "@/types/catalog";
import { newLine, type AlbaranHeader, type LineItem } from "@/types/albaran";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";
import { useNotice } from "@/components/ui/ActionFeedback";
import { updateAlbaranAction } from "@/app/(app)/albaran/actions";

export default function EditAlbaranClient({
  noteId,
  clientId,
  clientName,
  catalog,
  initialHeader,
  initialLines,
  initialDocumentDiscount,
}: {
  noteId: string;
  clientId: string;
  clientName: string;
  catalog: CatalogEntry[];
  initialHeader: AlbaranHeader;
  initialLines: LineItem[];
  initialDocumentDiscount: string;
}) {
  const router = useRouter();
  const [header, setHeader] = useState(initialHeader);
  const [lines, setLines] = useState<LineItem[]>(initialLines.length ? initialLines : [newLine(), newLine(), newLine()]);
  const [documentDiscount, setDocumentDiscount] = useState(initialDocumentDiscount);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const lock = useRef(false);
  const snapshot = JSON.stringify({ header, lines, documentDiscount });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const allowNavigation = useUnsavedChanges(snapshot !== savedSnapshot);
  const notify = useNotice();
  const reviewItems = catalog.filter((p) => p.priceText);
  const totalWithDocumentDiscount = applyDiscountToAmount(
    lines.reduce((sum, line) => sum + lineTotal(line), 0),
    documentDiscount
  );

  const handleSave = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setMessage(null);
    try {
      await updateAlbaranAction(noteId, clientId, header, lines, documentDiscount);
      setSavedSnapshot(snapshot); allowNavigation();
      notify("Cambios del albarán guardados.", `/clientes/${clientId}`);
      router.push(`/clientes/${clientId}`);
    } catch (err) {
      setMessage({ type: "error", text: "Error al guardar los cambios: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      lock.current = false; setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (lock.current) return;
    lock.current = true;
    setGenerating(true);
    setMessage(null);
    try {
      const { generateAlbaranPdf, downloadPdf } = await import("@/lib/pdf/generateAlbaran");
      const bytes = await generateAlbaranPdf(header, lines, documentDiscount);
      // Es desa abans de descarregar: a Safari mòbil, la descàrrega d'un PDF
      // pot interrompre una petició de xarxa concurrent en curs.
      try {
        await updateAlbaranAction(noteId, clientId, header, lines, documentDiscount);
      } catch (saveErr) {
        setMessage({
          type: "error",
          text: "No se han podido guardar los cambios: " + (saveErr instanceof Error ? saveErr.message : String(saveErr)),
        });
        return;
      }
      setSavedSnapshot(snapshot);
      downloadPdf(bytes, header.pakbonnummer);
      setMessage({ type: "success", text: "Cambios guardados. Descarga del PDF iniciada." });
    } catch (err) {
      setMessage({ type: "error", text: "Error al generar el PDF: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      lock.current = false; setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href={`/clientes/${clientId}`}
            className="rounded text-xs text-[var(--muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            ← Volver a {clientName || "la ficha del paciente"}
          </Link>
          <h1 className="text-lg font-bold text-[var(--navy)] mt-1">Editar albarán</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setLines((ls) => [...ls, newLine()])}>
            + Línea
          </Button>
          <Button variant="secondary" disabled={saving || generating} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button disabled={saving || generating} onClick={handleGeneratePdf}>
            {generating ? "Generando…" : "Guardar y descargar PDF"}
          </Button>
        </div>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`text-sm bg-white border border-[var(--line)] border-l-4 rounded-xl px-4 py-3 ${
            message.type === "error" ? "border-l-red-400" : "border-l-[var(--teal-deep)]"
          }`}
        >
          {message.text}
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <b>Revisar:</b> {reviewItems.map((p) => `${p.code} (${p.priceText})`).join(", ")} — sin precio numérico; ponlo a mano en la línea.
        </div>
      )}

      <fieldset disabled={saving || generating} className="min-w-0 space-y-6">
      <Card className="p-6 space-y-4">
        <AlbaranForm header={header} onChange={setHeader} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 pt-4 border-t border-[var(--line)]">
          <Field
            id="albaran-kleur"
            label="Kleur"
            value={header.kleur}
            onChange={(v) => setHeader({ ...header, kleur: v })}
          />
          <Field
            id="albaran-in_opdracht"
            label="In opdracht gemaakt van"
            value={header.in_opdracht}
            onChange={(v) => setHeader({ ...header, in_opdracht: v })}
          />
        </div>
      </Card>

      <LineItemsTable lines={lines} onChange={setLines} catalog={catalog} />

      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Field
          id="document-discount"
          label="Descuento global"
          value={documentDiscount}
          onChange={setDocumentDiscount}
          placeholder="%"
        />
        <p className="text-right text-sm text-[var(--muted)]">
          Total con descuento: {totalWithDocumentDiscount.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
        </p>
      </Card>
      </fieldset>
    </div>
  );
}
