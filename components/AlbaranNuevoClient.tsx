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
import type { Client } from "@/types/database";
import { emptyHeader, newLine, type AlbaranHeader, type LineItem } from "@/types/albaran";
import { generateAlbaranPdf, downloadPdf } from "@/lib/pdf/generateAlbaran";
import { saveAlbaranAction } from "@/app/(app)/albaran/actions";

const DRAFT_KEY = "albaran-nuevo-draft";

type Draft = { header: AlbaranHeader; lines: LineItem[]; clientId: string | null };

export default function AlbaranNuevoClient({ catalog, clients }: { catalog: CatalogEntry[]; clients: Client[] }) {
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineItem[]>([newLine(), newLine(), newLine()]);
  const [clientId, setClientId] = useState<string | null>(null);
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
    setMessage(null);
    setConfirmingNew(false);
    clearDraft();
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveAlbaranAction(clientId, header, lines);
      setMessage({ type: "success", text: "Albarà desat correctament." });
      clearDraft();
    } catch (err) {
      setMessage({ type: "error", text: "Error desant l'albarà: " + (err instanceof Error ? err.message : String(err)) });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const bytes = await generateAlbaranPdf(header, lines);
      downloadPdf(bytes, header.pakbonnummer);
      try {
        await saveAlbaranAction(clientId, header, lines);
        clearDraft();
      } catch (saveErr) {
        setMessage({
          type: "error",
          text:
            "El PDF s'ha descarregat, però no s'ha pogut desar a la base de dades: " +
            (saveErr instanceof Error ? saveErr.message : String(saveErr)),
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error generant el PDF: " + (err instanceof Error ? err.message : String(err)) });
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
          <Button variant="secondary" onClick={() => setConfirmingNew(true)}>
            Nou
          </Button>
          <Button variant="secondary" onClick={() => setLines((ls) => [...ls, newLine()])}>
            + Línia
          </Button>
          <Button variant="secondary" disabled={saving} onClick={handleSave}>
            {saving ? "Desant…" : "Guardar"}
          </Button>
          <Button disabled={generating} onClick={handleGeneratePdf}>
            {generating ? "Generant…" : "Descarregar PDF"}
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
          <b>Revisar:</b> {reviewItems.map((p) => `${p.code} (${p.priceText})`).join(", ")} — sense preu numèric; posa'l a mà a la línia.
        </div>
      )}

      <Card className="p-6 space-y-4">
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
        title="Buidar el formulari?"
        description="Es perdran totes les dades introduïdes en aquest albarà."
        confirmLabel="Buidar"
        danger
        onConfirm={handleNew}
        onCancel={() => setConfirmingNew(false)}
      />
    </div>
  );
}
