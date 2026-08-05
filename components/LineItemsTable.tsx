"use client";

import { useRef, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import type { LineItem } from "@/types/albaran";

const eur = (v: number) => v.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

function findByCode(catalog: CatalogEntry[], code: string) {
  const q = code.trim().toLowerCase();
  return catalog.find((p) => p.code.toLowerCase() === q);
}

function suggestions(catalog: CatalogEntry[], q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return catalog
    .filter((p) => p.code.toLowerCase().startsWith(query) || p.description.toLowerCase().includes(query))
    .slice(0, 7);
}

export default function LineItemsTable({
  lines,
  onChange,
  catalog,
}: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  catalog: CatalogEntry[];
}) {
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [sugIndex, setSugIndex] = useState(-1);
  const rowRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const setLine = (i: number, patch: Partial<LineItem>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const lineBedrag = (l: LineItem) => (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0);

  const handleCodeInput = (i: number, value: string) => {
    const m = findByCode(catalog, value);
    if (m) {
      setLine(i, { code: value, description: m.description, price: m.priceText ? "" : String(m.price ?? ""), priceText: m.priceText ?? "" });
    } else {
      setLine(i, { code: value });
    }
    setOpenRow(i);
    setSugIndex(-1);
  };

  const pickCode = (i: number, code: string) => {
    const p = catalog.find((x) => x.code === code);
    if (!p) return;
    setLine(i, {
      code: p.code,
      description: p.description,
      price: p.priceText ? "" : String(p.price ?? ""),
      priceText: p.priceText ?? "",
    });
    setOpenRow(null);
    setSugIndex(-1);
    const nx = rowRefs.current[i];
    nx?.focus();
  };

  const removeLine = (i: number) => {
    onChange(lines.filter((_, idx) => idx !== i));
  };

  const total = lines.reduce((s, l) => s + lineBedrag(l), 0);
  const filledCount = lines.filter((l) => l.code || l.description).length;
  const pageCount = Math.max(1, Math.ceil(filledCount / 11));

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-3 py-2 w-24">Cód</th>
              <th className="px-3 py-2">Omschrijving</th>
              <th className="px-3 py-2 w-20">Aantal</th>
              <th className="px-3 py-2 w-28">Prijs</th>
              <th className="px-3 py-2 w-28">Bedrag</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const bedrag = lineBedrag(l);
              const sugs = openRow === i ? suggestions(catalog, l.code) : [];
              return (
                <tr key={i} className="border-b border-[var(--line-soft,#eef2f8)] last:border-0">
                  <td className="px-3 py-1.5 relative">
                    <input
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                      value={l.code}
                      placeholder="1.1"
                      autoComplete="off"
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onFocus={() => {
                        setOpenRow(i);
                        setSugIndex(-1);
                      }}
                      onBlur={() => setTimeout(() => setOpenRow((cur) => (cur === i ? null : cur)), 180)}
                      onKeyDown={(e) => {
                        if (!sugs.length) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSugIndex((idx) => Math.min(idx + 1, sugs.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSugIndex((idx) => Math.max(idx - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          pickCode(i, (sugIndex >= 0 ? sugs[sugIndex] : sugs[0]).code);
                        } else if (e.key === "Escape") {
                          setOpenRow(null);
                          setSugIndex(-1);
                        }
                      }}
                    />
                    {sugs.length > 0 && (
                      <div className="absolute z-20 left-0 top-full mt-1 w-[420px] max-h-64 overflow-auto rounded-lg border border-[var(--line)] bg-white shadow-lg">
                        {sugs.map((p, k) => (
                          <div
                            key={p.code}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickCode(i, p.code);
                            }}
                            className={`flex gap-2 px-3 py-1.5 text-xs cursor-pointer ${k === sugIndex ? "bg-[var(--tint,#ecf9fa)]" : "hover:bg-slate-50"}`}
                          >
                            <span className="font-semibold text-[var(--navy)] w-10 shrink-0">{p.code}</span>
                            <span className="flex-1 truncate">{p.description}</span>
                            <span className="text-[var(--muted)] shrink-0">{p.priceText || (p.price != null ? eur(p.price) : "")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                      value={l.description}
                      onChange={(e) => setLine(i, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                      value={l.qty}
                      onChange={(e) => setLine(i, { qty: e.target.value })}
                      ref={(el) => {
                        rowRefs.current[i] = el;
                      }}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm focus:border-[var(--teal)] focus:outline-none"
                      value={l.price}
                      placeholder={l.priceText || ""}
                      onChange={(e) => setLine(i, { price: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-sm">
                    {l.priceText && !parseFloat(l.price) ? (
                      <span className="text-amber-700 text-xs">{l.priceText}</span>
                    ) : (
                      eur(bedrag)
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="text-slate-400 hover:text-red-500 text-lg leading-none"
                      aria-label="Eliminar línia"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-[var(--muted)]">
        <span>{pageCount > 1 ? `${filledCount} líneas · el PDF tendrá ${pageCount} páginas` : `${filledCount} líneas (1 página)`}</span>
        <span className="font-bold text-[var(--navy)] text-base">{eur(total)}</span>
      </div>
    </div>
  );
}
