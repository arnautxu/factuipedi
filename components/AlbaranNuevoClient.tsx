"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

import { saveAlbaranAction } from "@/app/(app)/albaran/actions";

const DRAFT_KEY = "albaran-nuevo-draft";

type Draft = { header: AlbaranHeader; lines: LineItem[]; clientId: string | null; clinicId: string | null };

export default function AlbaranNuevoClient({ catalog, clients, clinics }: { catalog: CatalogEntry[]; clients: Client[]; clinics: Clinic[] }) {
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineItem[]>([newLine(), newLine(), newLine()]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saved, setSaved] = useState<{ noteId: string; clientId: string } | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const operationLock = useRef(false);
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
    // Intentional one-time synchronization with the browser draft after SSR.
    restoreDraft();
    function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Draft>;
        if (draft.header) setHeader(draft.header);
        if (draft.lines?.length) setLines(draft.lines);
        if (draft.clientId !== undefined) setClientId(draft.clientId);
        if (draft.clinicId !== undefined) setClinicId(draft.clinicId);
      }
    } catch {
      // Esborrany corrupte o localStorage no disponible — s'ignora i es comença de zero.
    }
    setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || saved) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ header, lines, clientId, clinicId } satisfies Draft));
    } catch {
      // localStorage ple o no disponible — l'esborrany simplement no es desa.
    }
  }, [hydrated, header, lines, clientId, clinicId, saved]);

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
    setSaved(null);
    setConfirmingNew(false);
    clearDraft();
  };

  const handleSave = async () => {
    if (operationLock.current) return;
    if (saved) {
      setMessage({ type: "success", text: "Este albarán ya está guardado." });
      return;
    }
    if (!clinicId) {
      setMessage({ type: "error", text: "Selecciona una clínica antes de guardar." });
      return;
    }
    if (!clientId && !header.naam_patient.trim()) {
      setMessage({ type: "error", text: "Escribe o selecciona un paciente antes de guardar." });
      return;
    }
    operationLock.current = true;
    setSaving(true);
    setMessage(null);
    try {
      const created = await saveAlbaranAction(clientId, clinicId, header, lines);
      setMessage({ type: "success", text: "Albarán guardado correctamente." });
      setSaved(created);
      clearDraft();
    } catch (err) {
      setMessage({ type: "error", text: "Error al guardar el albarán: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      operationLock.current = false; setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (operationLock.current) return;
    if (!clinicId) {
      setMessage({ type: "error", text: "Selecciona una clínica antes de descargar." });
      return;
    }
    if (!clientId && !header.naam_patient.trim()) {
      setMessage({ type: "error", text: "Escribe o selecciona un paciente antes de descargar." });
      return;
    }
    operationLock.current = true;
    setGenerating(true);
    setMessage(null);
    try {
      const { generateAlbaranPdf, downloadPdf } = await import("@/lib/pdf/generateAlbaran");
      const bytes = await generateAlbaranPdf(header, lines);
      // Es desa ABANS de descarregar: a Safari mòbil, l'acció de descàrrega
      // d'un blob PDF pot interrompre una petició de xarxa concurrent (el
      // Server Action de desar), provocant un "Load failed" encara que el
      // PDF s'hagi generat bé. Desant primer evitem que la descàrrega
      // interfereixi amb el desat.
      try {
        if (!saved) {
          const created = await saveAlbaranAction(clientId, clinicId, header, lines);
          setSaved(created);
        }
        clearDraft();
      } catch (saveErr) {
        setMessage({
          type: "error",
          text: "No se ha podido guardar el albarán: " + (saveErr instanceof Error ? saveErr.message : String(saveErr)),
        });
        return;
      }
      downloadPdf(bytes, header.pakbonnummer);
      setMessage({ type: "success", text: "Albarán guardado. Descarga del PDF iniciada." });
    } catch (err) {
      setMessage({ type: "error", text: "Error al generar el PDF: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      operationLock.current = false; setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">Nuevo albarán</h1>
          <p className="text-xs text-[var(--muted)]">{catalog.length} productos en el catálogo</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={saving || generating} onClick={() => setConfirmingNew(true)}>
            Nuevo
          </Button>
          <Button variant="secondary" disabled={saving || generating || Boolean(saved)} onClick={() => setLines((ls) => [...ls, newLine()])}>
            + Línea
          </Button>
          <Button variant="secondary" disabled={saving || generating} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar"}
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

      {saved && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--tint)] px-4 py-3 text-sm">
          <span className="font-medium text-[var(--navy)]">Albarán creado.</span>
          <Link href={`/clientes/${saved.clientId}/albaran/${saved.noteId}`} className="font-semibold text-[var(--navy)] underline">Ver o editar albarán</Link>
          <button type="button" onClick={handleNew} className="font-semibold text-[var(--navy)] underline">Crear otro</button>
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <b>Revisar:</b> {reviewItems.map((p) => `${p.code} (${p.priceText})`).join(", ")} — sin precio numérico; ponlo a mano en la línea.
        </div>
      )}

      <fieldset disabled={saving || generating || Boolean(saved)} className="min-w-0 space-y-6">
      <Card className="p-6 space-y-4">
        <ClientPicker
          clients={clients}
          clinics={clinics}
          clinicId={clinicId}
          selectedId={clientId}
          onSelect={(client, patch) => {
            if (!client) {
              setClientId(null);
              setHeader((current) => ({ ...current, ...patch, naam_patient: "" }));
              return;
            }
            setClientId(client?.id ?? null);
            setClinicId(client?.clinic_id ?? clinicId);
            setHeader((h) => ({ ...h, ...patch }));
          }}
          onNewName={(name) => {
            setClientId(null);
            setHeader((current) => ({ ...current, naam_patient: name }));
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
                in_opdracht: clinic?.name ?? "",
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

      </fieldset>
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
