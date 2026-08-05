"use client";

import { useState } from "react";
import AlbaranForm from "@/components/AlbaranForm";
import LineItemsTable from "@/components/LineItemsTable";
import ClientPicker from "@/components/ClientPicker";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CatalogEntry } from "@/types/catalog";
import type { Client } from "@/types/database";
import { emptyHeader, newLine, type LineItem } from "@/types/albaran";
import { generateAlbaranPdf, downloadPdf } from "@/lib/pdf/generateAlbaran";
import { saveAlbaranAction } from "@/app/(app)/albaran/actions";

export default function AlbaranNuevoClient({ catalog, clients }: { catalog: CatalogEntry[]; clients: Client[] }) {
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineItem[]>([newLine(), newLine(), newLine()]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);

  const reviewItems = catalog.filter((p) => p.priceText);

  const handleNew = () => {
    setHeader(emptyHeader());
    setLines([newLine(), newLine(), newLine()]);
    setClientId(null);
    setMessage(null);
    setConfirmingNew(false);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const bytes = await generateAlbaranPdf(header, lines);
      downloadPdf(bytes, header.pakbonnummer);
      try {
        await saveAlbaranAction(clientId, header, lines);
      } catch (saveErr) {
        setMessage(
          "El PDF s'ha descarregat, però no s'ha pogut desar a la base de dades: " +
            (saveErr instanceof Error ? saveErr.message : String(saveErr))
        );
      }
    } catch (err) {
      setMessage("Error generant el PDF: " + (err instanceof Error ? err.message : String(err)));
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
          <Button disabled={generating} onClick={handleGeneratePdf}>
            {generating ? "Generant…" : "Descarregar PDF"}
          </Button>
        </div>
      </div>

      {message && (
        <div role="alert" className="text-sm bg-white border border-[var(--line)] border-l-4 border-l-red-400 rounded-xl px-4 py-3">
          {message}
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
