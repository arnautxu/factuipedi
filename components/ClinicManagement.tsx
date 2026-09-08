"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Clinic } from "@/types/database";
import { manageClinicAction } from "@/app/(app)/clinicas/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionFeedback, useNotice, type Feedback } from "@/components/ui/ActionFeedback";

export default function ClinicManagement({ clinic, hasHistory }: { clinic: Clinic; hasHistory: boolean }) {
  const [operation, setOperation] = useState<"delete" | "archive" | "restore" | null>(null);
  const [pending, setPending] = useState(false); const lock = useRef(false);
  const [message, setMessage] = useState<Feedback | null>(null);
  const router = useRouter(); const notify = useNotice();
  const label = operation === "delete" ? "Eliminar clínica" : operation === "archive" ? "Archivar clínica" : "Restaurar clínica";
  const confirm = async () => {
    if (!operation || lock.current) return;
    lock.current = true; setPending(true); setMessage(null);
    try {
      const result = await manageClinicAction(clinic.id, operation);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: result.message! });
        if (result.redirectTo) { notify(result.message!, result.redirectTo); router.push(result.redirectTo); }
        router.refresh();
      }
    } catch { setMessage({ type: "error", text: "No se ha podido completar la acción. Comprueba la conexión y vuelve a intentarlo." }); }
    finally { lock.current = false; setPending(false); setOperation(null); }
  };
  return <section className="space-y-3 border-t border-[var(--line)] pt-5" aria-label="Gestionar clínica">
    <h2 className="text-sm font-semibold text-[var(--ink)]">Gestionar clínica</h2>
    <p className="text-sm text-[var(--muted)]">{clinic.active === false ? "Clínica archivada: el historial sigue disponible. Restáurala para crear nuevos albaranes." : hasHistory ? "Esta clínica tiene pacientes o historial. Puedes archivarla conservando sus datos y restaurarla más adelante." : "Puedes eliminar esta clínica porque no tiene pacientes ni historial asociado."}</p>
    <div className="flex flex-wrap gap-2">
      {clinic.active === false ? <Button disabled={pending} variant="secondary" onClick={() => setOperation("restore")}>Restaurar clínica</Button> : <Button disabled={pending} variant="secondary" onClick={() => setOperation("archive")}>Archivar clínica</Button>}
      {!hasHistory && <Button variant="danger" disabled={pending} onClick={() => setOperation("delete")}>Eliminar clínica</Button>}
    </div>
    <ActionFeedback message={message} />
    <ConfirmDialog open={operation !== null} title={`${label}: ${clinic.name}`} description={operation === "delete" ? "Se eliminará definitivamente esta clínica. Esta acción no se puede deshacer." : operation === "archive" ? "Se conservarán pacientes, albaranes y facturación. Dejará de aparecer al crear nuevos albaranes. Podrás restaurarla desde Clínicas archivadas." : "La clínica volverá a estar disponible al crear nuevos albaranes."} danger={operation === "delete"} pending={pending} confirmLabel={pending ? "Procesando…" : label} onConfirm={confirm} onCancel={() => setOperation(null)} />
  </section>;
}
