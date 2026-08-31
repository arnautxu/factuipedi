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
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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

const INVALID_SHEET_NAME = /[:\\\\/?*\[\]]/g;

function sheetName(category: string, used: Set<string>) {
  const base = (category.replace(INVALID_SHEET_NAME, " ").replace(/\s+/g, " ").trim() || "Varios").slice(0, 31);
  let name = base;
  let duplicate = 2;
  while (used.has(name)) {
    const suffix = ` (${duplicate++})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name);
  return name;
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
        setMessage("Error al guardar el cambio: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const confirmDelete = () => {
    const id = deletingId;
    if (!id) return;
    setDeletingId(null);
    startTransition(async () => {
      try {
        await deleteItemAction(id);
        setItems((prev) => prev.filter((it) => it.id !== id));
      } catch (err) {
        setMessage("Error al eliminar: " + (err instanceof Error ? err.message : String(err)));
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
        setMessage("Error al reordenar: " + (err instanceof Error ? err.message : String(err)));
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
        setMessage("Error al añadir el producto: " + (err instanceof Error ? err.message : String(err)));
      }
    });
  };

  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();
      const byCat = new Map<string, CatalogItem[]>();
      for (const it of items) {
        if (!byCat.has(it.cat)) byCat.set(it.cat, []);
        byCat.get(it.cat)!.push(it);
      }
      const usedSheetNames = new Set<string>();
      for (const [cat, its] of byCat) {
        const rows = [["COD", "DESCRIPCION", "PRECIO"], ...its.map((it) => [it.code, it.description, it.price_text || it.price || ""])];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName(cat, usedSheetNames));
      }

      // XLSX.writeFile does not consistently trigger a download in current
      // browser bundles. Creating the Blob ourselves works in Safari and Chrome.
      const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true });
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "catalogo-noadentlab.xlsx";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage("✓ Excel descargado.");
    } catch (err) {
      setMessage("No se ha podido generar el Excel: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleImportFile = (file: File) => {
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          await importFromXlsxAction(reader.result as ArrayBuffer);
          setMessage(`✓ Catálogo reimportado desde ${file.name}. Recargando…`);
          setTimeout(() => window.location.reload(), 800);
        } catch (err) {
          setMessage("Error al leer el Excel: " + (err instanceof Error ? err.message : String(err)));
        }
      });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--navy)]">Catálogo</h1>
          <p className="text-xs text-[var(--muted)]">{items.length} productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            Descargar Excel
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => fileRef.current?.click()}>
            Subir Excel
          </Button>
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
        <div role="status" className="animate-fade-slide-in text-sm bg-white border border-[var(--line)] border-l-4 border-l-[var(--teal-deep)] rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <div>
        <label htmlFor="catalog-search" className="sr-only">
          Buscar en el catálogo
        </label>
        <input
          id="catalog-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por código o descripción…"
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)] border-b border-[var(--line)]">
              <th className="px-3 py-2 w-16"></th>
              <th className="px-3 py-2 w-28">Categoría</th>
              <th className="px-3 py-2 w-20">Código</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2 w-32">Precio</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50">
              <td className="px-3 py-1.5"></td>
              <td className="px-3 py-1.5">
                <input
                  aria-label="Categoría del nuevo producto"
                  value={newDraft.cat}
                  onChange={(e) => setNewDraft({ ...newDraft, cat: e.target.value })}
                  placeholder="Categoría"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-xs outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  aria-label="Código del nuevo producto"
                  value={newDraft.code}
                  onChange={(e) => setNewDraft({ ...newDraft, code: e.target.value })}
                  placeholder="Código"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  aria-label="Descripción del nuevo producto"
                  value={newDraft.description}
                  onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                  placeholder="Descripción"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  aria-label="Precio del nuevo producto"
                  value={newDraft.price}
                  onChange={(e) => setNewDraft({ ...newDraft, price: e.target.value })}
                  placeholder="Precio"
                  className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                />
              </td>
              <td className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="rounded px-1.5 py-1 text-xs font-semibold text-[var(--navy)] transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                  + Añadir
                </button>
              </td>
            </tr>

            {filtered.map((item, i) => {
              const isEditing = editingId === item.id;
              return (
                <tr
                  key={item.id}
                  className="border-b border-[var(--line-soft)] transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-3 py-1.5">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => handleMove(item.id, "up")}
                        aria-label={`Mover ${item.code || item.description} arriba`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-[var(--muted)] transition-colors duration-150 hover:bg-slate-100 hover:text-[var(--navy)] disabled:opacity-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={i === filtered.length - 1}
                        onClick={() => handleMove(item.id, "down")}
                        aria-label={`Mover ${item.code || item.description} abajo`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-[var(--muted)] transition-colors duration-150 hover:bg-slate-100 hover:text-[var(--navy)] disabled:opacity-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  {isEditing ? (
                    <>
                      <td className="px-3 py-1.5">
                        <input
                          aria-label="Categoría"
                          value={editDraft.cat}
                          onChange={(e) => setEditDraft({ ...editDraft, cat: e.target.value })}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-xs outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          aria-label="Código"
                          value={editDraft.code}
                          onChange={(e) => setEditDraft({ ...editDraft, code: e.target.value })}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          aria-label="Descripción"
                          value={editDraft.description}
                          onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          aria-label="Precio"
                          value={editDraft.price}
                          onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                          placeholder={editDraft.priceText || "precio"}
                          className="w-full rounded-md border border-[var(--line)] px-1.5 py-1 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]"
                        />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="mr-2 rounded px-1.5 py-1 text-xs font-semibold text-[var(--navy)] transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded px-1.5 py-1 text-xs text-[var(--muted)] transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                        >
                          Cancelar
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
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="mr-3 rounded px-1.5 py-1 text-xs font-semibold text-[var(--navy)] transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="rounded px-1.5 py-1 text-xs text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                        >
                          Eliminar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-sm text-[var(--muted)] px-5 py-6">No se ha encontrado ningún producto.</p>}
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        title="¿Eliminar este producto?"
        description="Se eliminará del catálogo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
