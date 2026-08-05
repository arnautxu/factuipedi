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
        Eliminar client
      </button>
      <ConfirmDialog
        open={open}
        title="Eliminar aquest client?"
        description={`S'eliminaran ${clientName || "aquest client"} i tot el seu historial d'albarans. Aquesta acció no es pot desfer.`}
        confirmLabel={pending ? "Eliminant…" : "Eliminar"}
        danger
        onConfirm={() => startTransition(action)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
