"use client";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/ui/action-result";
import { ActionFeedback, useNotice, type Feedback } from "./ActionFeedback";
import { Button } from "./Button";
import { useUnsavedChanges } from "./useUnsavedChanges";

export function SaveForm({ action, submitLabel, children }: { action: (data: FormData) => Promise<ActionResult>; submitLabel: string; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);
  const lock = useRef(false);
  const router = useRouter();
  const notify = useNotice();
  const allowNavigation = useUnsavedChanges(dirty);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    lock.current = true; setPending(true); setMessage(null);
    try {
      const result = await action(data);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        // Wait until the fieldset is enabled before moving focus.
        requestAnimationFrame(() => (form.elements.namedItem(result.field ?? "") as HTMLElement | null)?.focus());
      } else {
        setDirty(false);
        setMessage({ type: "success", text: result.message ?? "Cambios guardados." });
        if (result.redirectTo) { allowNavigation(); notify(result.message ?? "Cambios guardados.", result.redirectTo); router.push(result.redirectTo); }
        else router.refresh();
      }
    } catch { setMessage({ type: "error", text: "No se han podido guardar los cambios. Comprueba la conexión y vuelve a intentarlo. Tus datos siguen en el formulario." }); }
    finally { lock.current = false; setPending(false); }
  };
  return <form onSubmit={submit} onChange={() => { setDirty(true); setMessage(null); }} aria-busy={pending} className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-6 shadow-sm">
    <fieldset disabled={pending} className="min-w-0 space-y-4">{children}<Button type="submit" disabled={pending}>{pending ? "Guardando…" : submitLabel}</Button></fieldset>
    <ActionFeedback message={message} />
  </form>;
}
