"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function DeleteClientButton({
  clientName,
  action,
}: {
  clientName: string;
  action: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-1.5 py-1 text-xs font-medium text-red-600 transition-colors duration-150 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        Eliminar cliente
      </button>
      <ConfirmDialog
        open={open}
        title="¿Eliminar este cliente?"
        description={`Se eliminará a ${clientName || "este cliente"} y todo su historial de albaranes. Esta acción no se puede deshacer.`}
        confirmLabel={pending ? "Eliminando…" : "Eliminar"}
        danger
        onConfirm={() => startTransition(action)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
