"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { ActionFeedback, useNotice, type Feedback } from "@/components/ui/ActionFeedback";
import type { ActionResult } from "@/lib/ui/action-result";
export default function DeleteClientButton({ clientName, action }: { clientName: string; action: () => Promise<ActionResult> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);
  const lock = useRef(false); const router = useRouter(); const notify = useNotice();
  const remove = async () => {
    if (lock.current) return;
    lock.current = true; setPending(true); setMessage(null);
    try {
      const result = await action();
      if (result.error) setMessage({ type: "error", text: result.error });
      else { notify(result.message ?? "Paciente eliminado.", "/clientes"); router.push("/clientes"); router.refresh(); }
    } catch { setMessage({ type: "error", text: "No se ha podido eliminar el paciente. Comprueba la conexión y vuelve a intentarlo." }); }
    finally { lock.current = false; setPending(false); setOpen(false); }
  };
  return <div className="space-y-3"><Button variant="danger" disabled={pending} onClick={() => setOpen(true)}>Eliminar paciente</Button>
    <ConfirmDialog open={open} title={`¿Eliminar a ${clientName || "este paciente"}?`} description="Se eliminarán la ficha y sus registros de importación y documentos asociados. Los albaranes se conservarán, pero dejarán de estar vinculados al paciente. Esta acción no se puede deshacer." confirmLabel={pending ? "Eliminando…" : "Eliminar paciente"} pending={pending} danger onConfirm={remove} onCancel={() => setOpen(false)} />
    <ActionFeedback message={message} />
  </div>;
}
