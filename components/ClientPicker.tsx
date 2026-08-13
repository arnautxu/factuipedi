"use client";

import { useId, useMemo, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputId = useId();
  const listboxId = useId();

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
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
        Cliente existente
      </label>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--tint)] px-3 py-2 text-sm">
          <span className="font-medium text-[var(--navy)]">{selected.naam_patient || "(sin nombre)"}</span>
          <button
            type="button"
            onClick={() => onSelect(null, {})}
            className="rounded px-1.5 py-1 text-xs text-[var(--muted)] transition-colors duration-150 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            Quitar selección
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          value={query}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
          aria-controls={listboxId}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={(e) => {
            if (!open || filtered.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((idx) => Math.min(idx + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((idx) => Math.max(idx - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(activeIndex >= 0 ? filtered[activeIndex] : filtered[0]);
            } else if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Busca un cliente para rellenar el formulario automáticamente…"
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
        />
      )}
      {open && !selected && filtered.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="animate-fade-slide-in absolute z-20 left-0 top-full mt-1 w-full max-h-64 overflow-auto rounded-lg border border-[var(--line)] bg-white shadow-lg"
        >
          {filtered.map((c, idx) => (
            <div
              key={c.id}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${idx === activeIndex ? "bg-[var(--tint)]" : "hover:bg-slate-50"}`}
            >
              <div className="font-medium text-[var(--navy)]">{c.naam_patient || "(sin nombre)"}</div>
              <div className="text-xs text-[var(--muted)]">{[c.behandelaar, c.klant_regel2].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
