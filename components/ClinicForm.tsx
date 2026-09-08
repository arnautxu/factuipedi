import type { Clinic } from "@/types/database";
import { UncontrolledField, UncontrolledTextarea } from "@/components/ui/Field";
import { SaveForm } from "@/components/ui/SaveForm";
import type { ActionResult } from "@/lib/ui/action-result";

export default function ClinicForm({ clinic, action, submitLabel }: { clinic?: Partial<Clinic>; action: (formData: FormData) => Promise<ActionResult>; submitLabel: string }) {
  return (
    <SaveForm action={action} submitLabel={submitLabel}>
      <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
        <UncontrolledField required label="Nombre de la clínica" name="name" defaultValue={clinic?.name ?? ""} />
        <UncontrolledField label="Behandelaar" name="behandelaar" defaultValue={clinic?.behandelaar ?? ""} />
      </div>
      <UncontrolledTextarea label="Dirección" name="address" rows={3} defaultValue={clinic?.address ?? ""} />
      <UncontrolledTextarea label="Notas" name="notes" rows={3} defaultValue={clinic?.notes ?? ""} />
    </SaveForm>
  );
}
