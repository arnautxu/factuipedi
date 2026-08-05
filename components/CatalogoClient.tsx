"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { importFromSheetAction, importFromXlsxAction } from "@/app/(app)/catalogo/actions";

const eur = (v: number | null) => (v == null ? "" : v.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }));

export default function CatalogoClient({ catalog }: { catalog: CatalogEntry[] }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((p) => !q || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    const map = new Map<string, CatalogEntry[]>();
    for (const p of filtered) {
      if (!map.has(p.cat)) map.set(p.cat, []);
      map.get(p.cat)!.push(p);
    }
    return [...map.entries()];
  }, [catalog, query]);

  const handleImportSheet = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const { count, source } = await importFromSheetAction();
        setMessage(`✓ ${count} productes importats des de ${source}.`);
      } catch (err) {
        setMessage("Error important el catàleg: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleFile = (file: File) => {
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          const { count } = await importFromXlsxAction(reader.result as ArrayBuffer);
          setMessage(`✓ ${count} productes importats des de ${file.name}.`);
        } catch (err) {
          setMessage("Error llegint l'Excel: " + (err instanceof Error ? err.message : String(err)));
        }
      });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">Catàleg</h1>
          <p className="text-xs text-[var(--muted)]">{catalog.length} productes</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleImportSheet}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? "Important…" : "Importar des de Sheet"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Pujar .xlsx
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {message && (
        <div className="text-sm bg-white border border-[var(--line)] border-l-4 border-l-[var(--teal)] rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca per codi o descripció…"
        className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
      />

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm divide-y divide-[var(--line-soft,#eef2f8)]">
        {groups.map(([cat, items]) => (
          <div key={cat} className="px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-2">{cat.replace(/_/g, " ")}</h3>
            <div className="space-y-1">
              {items.map((p) => (
                <div key={p.code} className="flex gap-3 text-sm py-1">
                  <span className="w-14 shrink-0 font-semibold text-[var(--navy)]">{p.code}</span>
                  <span className="flex-1">{p.description}</span>
                  <span className="text-[var(--muted)] shrink-0">{p.priceText || eur(p.price)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-[var(--muted)] px-5 py-6">Cap producte trobat.</p>}
      </div>
    </div>
  );
}
