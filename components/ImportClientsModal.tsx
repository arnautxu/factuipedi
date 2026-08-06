"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { parseCsvRows } from "@/lib/clients/parseCsv";
import { importClientsAction } from "@/app/(app)/clientes/actions";
import type { Client } from "@/types/database";
import { Button } from "@/components/ui/Button";

type FieldKey = "naam_patient" | "geboortedatum" | "behandelaar" | "klant_regel2" | "in_opdracht" | "notes";

const FIELDS: { key: FieldKey; label: string; aliases: string[] }[] = [
  { key: "naam_patient", label: "Naam patiënt", aliases: ["naam patient", "naam", "patient", "paciente", "nombre", "name", "nom"] },
  { key: "geboortedatum", label: "Geboorte datum", aliases: ["geboorte", "birth", "nacimiento", "naixement"] },
  { key: "behandelaar", label: "Behandelaar", aliases: ["behandelaar", "doctor", "dentista", "metge"] },
  { key: "klant_regel2", label: "Kliniek / adres", aliases: ["kliniek", "clinica", "adres", "address", "direccion"] },
  { key: "in_opdracht", label: "In opdracht gemaakt van", aliases: ["opdracht", "orden", "commande"] },
  { key: "notes", label: "Notes", aliases: ["notes", "notas", "observ"] },
];

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function guessColumn(normHeaders: string[], aliases: string[]): number | null {
  for (const alias of aliases) {
    const idx = normHeaders.findIndex((h) => h.includes(norm(alias)));
    if (idx !== -1) return idx;
  }
  return null;
}

const selectClass =
  "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]";

export function ImportClientsModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState<"pick" | "map" | "done">("pick");
  const [fileName, setFileName] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number | null>>({
    naam_patient: null,
    geboortedatum: null,
    behandelaar: null,
    klant_regel2: null,
    in_opdracht: null,
    notes: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [resultCount, setResultCount] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) {
      setStep("pick");
      setFileName("");
      setHasHeader(true);
      setRawRows([]);
      setError(null);
    }
  }, [open]);

  const width = rawRows.reduce((m, r) => Math.max(m, r.length), 0);
  const headers = useMemo(() => {
    if (!rawRows.length) return [];
    if (hasHeader) return rawRows[0].map((h, i) => h || `Columna ${i + 1}`);
    return Array.from({ length: width }, (_, i) => `Columna ${i + 1}`);
  }, [rawRows, hasHeader, width]);
  const dataRows = useMemo(() => (hasHeader ? rawRows.slice(1) : rawRows), [rawRows, hasHeader]);

  const handleFile = (file: File) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsvRows(String(reader.result));
        if (!rows.length) {
          setError("El fitxer no té cap fila amb dades.");
          return;
        }
        setRawRows(rows);
        const normHeaders = (hasHeader ? rows[0] : rows[0].map((_, i) => `Columna ${i + 1}`)).map(norm);
        const guessed = {} as Record<FieldKey, number | null>;
        for (const f of FIELDS) guessed[f.key] = guessColumn(normHeaders, f.aliases);
        setMapping(guessed);
        setStep("map");
      } catch (err) {
        setError("Error llegint el CSV: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setError(null);
    if (!FIELDS.some((f) => mapping[f.key] != null)) {
      setError("Selecciona almenys una columna per importar.");
      return;
    }
    const rows: Partial<Client>[] = [];
    for (const row of dataRows) {
      const rec: Partial<Client> = {};
      let hasValue = false;
      for (const f of FIELDS) {
        const idx = mapping[f.key];
        if (idx == null) continue;
        const val = (row[idx] ?? "").trim();
        if (val) hasValue = true;
        rec[f.key] = val || null;
      }
      if (hasValue) rows.push(rec);
    }
    if (!rows.length) {
      setError("No s'ha trobat cap fila amb dades per importar.");
      return;
    }
    startTransition(async () => {
      try {
        const { count } = await importClientsAction(rows);
        setResultCount(count);
        setStep("done");
        onImported(count);
      } catch (err) {
        setError("Error important: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="m-auto w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-0 shadow-lg backdrop:bg-black/30"
      aria-labelledby="import-clients-title"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <h2 id="import-clients-title" className="text-base font-bold text-[var(--ink)]">
          Importar clients des de CSV
        </h2>

        {step === "pick" && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Puja un fitxer CSV amb la teva base de dades de clients. Al pas següent podràs triar quina columna
              correspon a cada camp.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>Seleccionar CSV</Button>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}

        {step === "map" && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">
                {fileName} · {dataRows.length} files de dades detectades
              </p>
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4 accent-[var(--navy)]"
                />
                La primera fila és la capçalera
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label
                    htmlFor={`map-${f.key}`}
                    className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1"
                  >
                    {f.label}
                  </label>
                  <select
                    id={`map-${f.key}`}
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key]: e.target.value === "" ? null : Number(e.target.value) }))
                    }
                    className={selectClass}
                  >
                    <option value="">— No importar —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {dataRows.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
                  Previsualització
                </p>
                <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
                        {FIELDS.map((f) => (
                          <th key={f.key} className="px-3 py-2 whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-[var(--line-soft)] last:border-0">
                          {FIELDS.map((f) => (
                            <td key={f.key} className="px-3 py-1.5 whitespace-nowrap">
                              {mapping[f.key] != null ? row[mapping[f.key]!] || "—" : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel·lar
              </Button>
              <Button disabled={pending} onClick={handleImport}>
                {pending ? "Important…" : "Importar"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="mt-4 space-y-4">
            <p role="status" className="text-sm text-[var(--ink)]">
              S&apos;han importat <b>{resultCount}</b> clients nous correctament.
            </p>
            <div className="flex justify-end">
              <Button onClick={onClose}>Tancar</Button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
