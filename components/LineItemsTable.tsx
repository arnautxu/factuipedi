"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry } from "@/types/catalog";
import type { LineItem } from "@/types/albaran";
import { lineTotal } from "@/lib/albaran/pricing";

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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rowRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const codeInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // The suggestion dropdown is portaled to <body> and positioned with `fixed`
  // coordinates: it's anchored to a table cell inside an `overflow-x-auto`
  // wrapper, and setting overflow-x forces the browser to clip overflow-y too,
  // so an absolutely-positioned dropdown would get cut off instead of floating
  // above the rest of the page.
  useLayoutEffect(() => {
    if (openRow === null) return;
    const el = codeInputRefs.current[openRow];
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: Math.min(420, window.innerWidth - r.left - 16) });
    };
    // Position before paint to avoid a jumping portaled suggestion list.
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [openRow]);

  // Stable row keys: `lines` has no id field, and edits replace each entry with a
  // new object, so identity can't be used. New lines are always appended, and
  // removal always goes through removeLine below, so a parallel id array kept in
  // lockstep (push on growth, splice on removal) stays correctly aligned by index.
  const [rowKeys, setRowKeys] = useState(() => ({ ids: lines.map((_, i) => i), next: lines.length }));
  if (rowKeys.ids.length !== lines.length) {
    const extra = Math.max(0, lines.length - rowKeys.ids.length);
    setRowKeys({ ids: [...rowKeys.ids.slice(0, lines.length), ...Array.from({ length: extra }, (_, i) => rowKeys.next + i)], next: rowKeys.next + extra });
  }

  const setLine = (i: number, patch: Partial<LineItem>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

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
    setRowKeys((keys) => ({ ...keys, ids: keys.ids.filter((_, index) => index !== i) }));
    onChange(lines.filter((_, idx) => idx !== i));
  };

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
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
              <th className="px-3 py-2 w-24">Korting</th>
              <th className="px-3 py-2 w-28">Bedrag</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const bedrag = lineTotal(l);
              const sugs = openRow === i ? suggestions(catalog, l.code) : [];
              const listboxId = `line-${rowKeys.ids[i]}-suggestions`;
              return (
                <tr
                  key={rowKeys.ids[i]}
                  className="animate-fade-slide-in border-b border-[var(--line-soft)] transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-3 py-1.5 relative">
                    <input
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                      value={l.code}
                      placeholder="1.1"
                      autoComplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={sugs.length > 0}
                      aria-controls={listboxId}
                      ref={(el) => {
                        codeInputRefs.current[i] = el;
                      }}
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
                    {sugs.length > 0 &&
                      dropdownPos &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div
                          id={listboxId}
                          role="listbox"
                          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                          className="animate-fade-slide-in fixed z-50 max-h-64 overflow-auto rounded-lg border border-[var(--line)] bg-white shadow-lg"
                        >
                          {sugs.map((p, k) => (
                            <div
                              key={p.code}
                              role="option"
                              aria-selected={k === sugIndex}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pickCode(i, p.code);
                              }}
                              className={`flex gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${k === sugIndex ? "bg-[var(--tint)]" : "hover:bg-slate-50"}`}
                            >
                              <span className="font-semibold text-[var(--navy)] w-10 shrink-0">{p.code}</span>
                              <span className="flex-1 truncate">{p.description}</span>
                              <span className="text-[var(--muted)] shrink-0">{p.priceText || (p.price != null ? eur(p.price) : "")}</span>
                            </div>
                          ))}
                        </div>,
                        document.body
                      )}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      aria-label="Omschrijving"
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                      value={l.description}
                      onChange={(e) => setLine(i, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      aria-label="Aantal"
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
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
                      aria-label="Prijs"
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm outline-none transition-colors focus:border-[var(--focus)]"
                      value={l.price}
                      placeholder={l.priceText || ""}
                      onChange={(e) => setLine(i, { price: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      aria-label="Korting"
                      placeholder="%"
                      className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm text-amber-700 outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--focus)]"
                      value={l.discount}
                      onChange={(e) => setLine(i, { discount: e.target.value })}
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-[var(--muted)] transition-colors duration-150 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      aria-label="Eliminar línea"
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
