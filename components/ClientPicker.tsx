"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/types/database";
import type { AlbaranHeader } from "@/types/albaran";

export default function ClientPicker({
  clients,
  selectedId,
  onSelect,
}: {
  clients: Client[];
  selectedId: string | null;
  onSelect: (client: Client | null, header: Partial<AlbaranHeader>) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients
      .filter(
        (c) =>
          (c.naam_patient ?? "").toLowerCase().includes(q) ||
          (c.behandelaar ?? "").toLowerCase().includes(q) ||
          (c.klant_regel2 ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [clients, query]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  const pick = (c: Client) => {
    onSelect(c, {
      naam_patient: c.naam_patient ?? "",
      geboortedatum: c.geboortedatum ?? "",
      behandelaar: c.behandelaar ?? "",
      klant_regel2: c.klant_regel2 ?? "",
      in_opdracht: c.in_opdracht ?? "",
    });
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
        Client existent
      </label>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--tint,#ecf9fa)] px-3 py-2 text-sm">
          <span className="font-medium text-[var(--navy)]">{selected.naam_patient || "(sense nom)"}</span>
          <button
            type="button"
            onClick={() => onSelect(null, {})}
            className="text-xs text-[var(--muted)] hover:text-red-500"
          >
            Treure selecció
          </button>
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Cerca un client per omplir el formulari automàticament…"
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
      )}
      {open && !selected && filtered.length > 0 && (
        <div className="absolute z-20 left-0 top-full mt-1 w-full max-h-64 overflow-auto rounded-lg border border-[var(--line)] bg-white shadow-lg">
          {filtered.map((c) => (
            <div
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
            >
              <div className="font-medium text-[var(--navy)]">{c.naam_patient || "(sense nom)"}</div>
              <div className="text-xs text-[var(--muted)]">{[c.behandelaar, c.klant_regel2].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
