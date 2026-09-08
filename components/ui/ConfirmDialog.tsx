"use client";

import { useEffect, useRef, useId } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  pending?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  danger,
  pending = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClose={onCancel}
      className="m-auto max-w-sm rounded-2xl border border-[var(--line)] bg-white p-0 shadow-lg backdrop:bg-black/30"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={pending}
    >
      <div className="w-full p-6">
        <h2 id={titleId} className="text-base font-bold text-[var(--ink)]">
          {title}
        </h2>
        {description && <p id={descriptionId} className="mt-2 text-sm text-[var(--muted)]">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button autoFocus variant="secondary" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
