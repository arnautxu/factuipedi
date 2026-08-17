"use client";

import { useEffect, useState } from "react";
import AlbaranForm from "@/components/AlbaranForm";
import LineItemsTable from "@/components/LineItemsTable";
import ClientPicker from "@/components/ClientPicker";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CatalogEntry } from "@/types/catalog";
import type { Client, Clinic } from "@/types/database";
import { emptyHeader, newLine, type AlbaranHeader, type LineItem } from "@/types/albaran";
import { generateAlbaranPdf, downloadPdf } from "@/lib/pdf/generateAlbaran";
import { saveAlbaranAction } from "@/app/(app)/albaran/actions";

const DRAFT_KEY = "albaran-nuevo-draft";

type Draft = { header: AlbaranHeader; lines: LineItem[]; clientId: string | null };

export default function AlbaranNuevoClient({ catalog, clients, clinics }: { catalog: CatalogEntry[]; clients: Client[]; clinics: Clinic[] }) {
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineItem[]>([newLine(), newLine(), newLine()]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const reviewItems = catalog.filter((p) => p.priceText);

  // Restaura l'esborrany desat (si n'hi ha) després del muntatge, per no
  // perdre el formulari en curs si l'usuari navega a una altra pestanya i
  // torna. Es fa en un efecte (no a l'estat inicial) per evitar un mismatch
  // d'hidratació entre el render del servidor i el localStorage del client.
  // `hydrated` és estat (no una ref) i es marca true en el mateix efecte que
  // restaura les dades, perquè React apliqui totes dues coses juntes en un
  // sol render — així l'efecte de desat de més avall mai s'executa amb els
  // valors per defecte encara no substituïts (el que sobreescrivia l'esborrany).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Draft>;
        if (draft.header) setHeader(draft.header);
        if (draft.lines?.length) setLines(draft.lines);
        if (draft.clientId !== undefined) setClientId(draft.clientId);
      }
    } catch {
      // Esborrany corrupte o localStorage no disponible — s'ignora i es comença de zero.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ header, lines, clientId } satisfies Draft));
    } catch {
      // localStorage ple o no disponible — l'esborrany simplement no es desa.
    }
  }, [hydrated, header, lines, clientId]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // no-op
    }
  };

  const handleNew = () => {
    setHeader(emptyHeader());
    setLines([newLine(), newLine(), newLine()]);
    setClientId(null);
    setClinicId(null);
    setMessage(null);
    setConfirmingNew(false);
    clearDraft();
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveAlbaranAction(clientId, header, lines);
      setMessage({ type: "success", text: "Albarán guardado correctamente." });
      clearDraft();
    } catch (err) {
      setMessage({ type: "error", text: "Error al guardar el albarán: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const bytes = await generateAlbaranPdf(header, lines);
      // Es desa ABANS de descarregar: a Safari mòbil, l'acció de descàrrega
      // d'un blob PDF pot interrompre una petició de xarxa concurrent (el
      // Server Action de desar), provocant un "Load failed" encara que el
      // PDF s'hagi generat bé. Desant primer evitem que la descàrrega
      // interfereixi amb el desat.
      try {
        await saveAlbaranAction(clientId, header, lines);
        clearDraft();
      } catch (saveErr) {
        setMessage({
          type: "error",
          text: "No se ha podido guardar el albarán: " + (saveErr instanceof Error ? saveErr.message : String(saveErr)),
        });
        return;
      }
      downloadPdf(bytes, header.pakbonnummer);
    } catch (err) {
      setMessage({ type: "error", text: "Error al generar el PDF: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">Nuevo albarán</h1>
          <p className="text-xs text-[var(--muted)]">{catalog.length} productos en el catálogo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setConfirmingNew(true)}>
            Nuevo
          </Button>
          <Button variant="secondary" onClick={() => setLines((ls) => [...ls, newLine()])}>
            + Línea
          </Button>
          <Button variant="secondary" disabled={saving} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button disabled={generating} onClick={handleGeneratePdf}>
            {generating ? "Generando…" : "Descargar PDF"}
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

      <Card className="p-6 space-y-4">
        <ClientPicker
          clients={clients}
          clinics={clinics}
          clinicId={clinicId}
          selectedId={clientId}
          onSelect={(client, patch) => {
            setClientId(client?.id ?? null);
            setClinicId(client?.clinic_id ?? clinicId);
            setHeader((h) => ({ ...h, ...patch }));
          }}
        />

        <div>
          <label htmlFor="albaran-clinic" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Clínica
          </label>
          <select
            id="albaran-clinic"
            value={clinicId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value || null;
              const clinic = clinics.find((item) => item.id === nextId);
              setClinicId(nextId);
              setClientId(null);
              setHeader((current) => ({
                ...current,
                behandelaar: clinic?.behandelaar ?? "",
                klant_regel2: clinic?.address ?? "",
                in_opdracht: clinic?.name ?? current.in_opdracht,
              }));
            }}
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
          >
            <option value="">Selecciona una clínica</option>
            {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">Al seleccionarla se completa el responsable y la dirección del albarán.</p>
        </div>

        <div className="pt-2 border-t border-[var(--line)]">
          <AlbaranForm header={header} onChange={setHeader} />
        </div>

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

      <ConfirmDialog
        open={confirmingNew}
        title="¿Vaciar el formulario?"
        description="Se perderán todos los datos introducidos en este albarán."
        confirmLabel="Vaciar"
        danger
        onConfirm={handleNew}
        onCancel={() => setConfirmingNew(false)}
      />
    </div>
  );
}
