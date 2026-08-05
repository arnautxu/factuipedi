"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import type { CatalogItem } from "@/types/database";
import {
  importFromXlsxAction,
  createItemAction,
  updateItemAction,
  deleteItemAction,
  moveItemAction,
} from "@/app/(app)/catalogo/actions";

const eur = (v: number | null) => (v == null ? "" : v.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }));

type Draft = { cat: string; code: string; description: string; price: string; priceText: string };

function itemToDraft(item: CatalogItem): Draft {
  return {
    cat: item.cat,
    code: item.code,
    description: item.description,
    price: item.price != null ? String(item.price) : "",
    priceText: item.price_text ?? "",
  };
}

const EMPTY_DRAFT: Draft = { cat: "Varios", code: "", description: "", price: "", priceText: "" };

function draftToInput(d: Draft) {
  return {
    cat: d.cat.trim() || "Varios",
    code: d.code.trim(),
    description: d.description.trim(),
    price: d.price.trim() ? parseFloat(d.price.replace(",", ".")) : null,
    priceText: d.priceText.trim() || null,
  };
}

export default function CatalogoClient({ catalog }: { catalog: CatalogItem[] }) {
  const [items, setItems] = useState(catalog);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [items, query]);

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setEditDraft(itemToDraft(item));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const input = draftToInput(editDraft);
    startTransition(async () => {
      try {
        const updated = await updateItemAction(id, input);
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
        setEditingId(null);
      } catch (err) {
        setMessage("Error desant el canvi: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Eliminar aquest producte del catàleg?")) return;
    startTransition(async () => {
      try {
        await deleteItemAction(id);
        setItems((prev) => prev.filter((it) => it.id !== id));
      } catch (err) {
        setMessage("Error eliminant: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const idx = items.findIndex((it) => it.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
    const next = items.slice();
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setItems(next);
    startTransition(async () => {
      try {
        await moveItemAction(id, direction);
      } catch (err) {
        setMessage("Error reordenant: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleCreate = () => {
    if (!newDraft.description.trim() && !newDraft.code.trim()) return;
    const input = draftToInput(newDraft);
    startTransition(async () => {
      try {
        const created = await createItemAction(input);
        setItems((prev) => [...prev, created]);
        setNewDraft(EMPTY_DRAFT);
      } catch (err) {
        setMessage("Error afegint el producte: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const byCat = new Map<string, CatalogItem[]>();
    for (const it of items) {
      if (!byCat.has(it.cat)) byCat.set(it.cat, []);
      byCat.get(it.cat)!.push(it);
    }
    for (const [cat, its] of byCat) {
      const rows = [["COD", "DESCRIPCION", "PRECIO"], ...its.map((it) => [it.code, it.description, it.price_text || it.price || ""])];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, cat.slice(0, 31) || "Varios");
    }
    XLSX.writeFile(wb, "catalogo-noadentlab.xlsx");
  };

  const handleImportFile = (file: File) => {
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          await importFromXlsxAction(reader.result as ArrayBuffer);
          setMessage(`✓ Catàleg reimportat des de ${file.name}. Recarregant…`);
          setTimeout(() => window.location.reload(), 800);
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
          <p className="text-xs text-[var(--muted)]">{items.length} productes</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50"
          >
            Descarregar Excel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--line)] bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Pujar Excel
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
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

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-3 py-2 w-16"></th>
              <th className="px-3 py-2 w-28">Categoria</th>
              <th className="px-3 py-2 w-20">Codi</th>
              <th className="px-3 py-2">Descripció</th>
              <th className="px-3 py-2 w-32">Preu</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const isEditing = editingId === item.id;
              return (
                <tr key={item.id} className="border-b border-[var(--line-soft,#eef2f8)] last:border-0">
                  <td className="px-3 py-1.5">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => handleMove(item.id, "up")}
                        className="text-slate-400 hover:text-[var(--navy)] disabled:opacity-20 text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={i === filtered.length - 1}
                        onClick={() => handleMove(item.id, "down")}
                        className="text-slate-400 hover:text-[var(--navy)] disabled:opacity-20 text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  {isEditing ? (
                    <>
                      <td className="px-3 py-1.5">
                        <input
                          value={editDraft.cat}
                          onChange={(e) => setEditDraft({ ...editDraft, cat: e.target.value })}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={editDraft.code}
                          onChange={(e) => setEditDraft({ ...editDraft, code: e.target.value })}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={editDraft.description}
                          onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={editDraft.price}
                          onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                          placeholder={editDraft.priceText || "preu"}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <button onClick={() => saveEdit(item.id)} className="text-xs font-semibold text-[var(--navy)] mr-2">
                          Desar
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-[var(--muted)]">
                          Cancel·la
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-1.5 text-xs text-[var(--muted)]">{item.cat.replace(/_/g, " ")}</td>
                      <td className="px-3 py-1.5 font-semibold text-[var(--navy)]">{item.code}</td>
                      <td className="px-3 py-1.5">{item.description}</td>
                      <td className="px-3 py-1.5 text-[var(--muted)]">{item.price_text || eur(item.price)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <button onClick={() => startEdit(item)} className="text-xs font-semibold text-[var(--navy)] mr-3">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500">
                          Eliminar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            <tr className="bg-slate-50">
              <td className="px-3 py-1.5"></td>
              <td className="px-3 py-1.5">
                <input
                  value={newDraft.cat}
                  onChange={(e) => setNewDraft({ ...newDraft, cat: e.target.value })}
                  placeholder="Categoria"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-xs"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  value={newDraft.code}
                  onChange={(e) => setNewDraft({ ...newDraft, code: e.target.value })}
                  placeholder="Codi"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  value={newDraft.description}
                  onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                  placeholder="Descripció"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  value={newDraft.price}
                  onChange={(e) => setNewDraft({ ...newDraft, price: e.target.value })}
                  placeholder="Preu"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm"
                />
              </td>
              <td className="px-3 py-1.5">
                <button type="button" onClick={handleCreate} className="text-xs font-semibold text-[var(--navy)]">
                  + Afegir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-sm text-[var(--muted)] px-5 py-6">Cap producte trobat.</p>}
      </div>
    </div>
  );
}
