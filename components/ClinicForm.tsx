import type { Clinic } from "@/types/database";
import { UncontrolledField, UncontrolledTextarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ClinicForm({ clinic, action, submitLabel }: { clinic?: Partial<Clinic>; action: (formData: FormData) => void; submitLabel: string }) {
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
        <UncontrolledField label="Nombre de la clínica" name="name" defaultValue={clinic?.name ?? ""} />
        <UncontrolledField label="Behandelaar" name="behandelaar" defaultValue={clinic?.behandelaar ?? ""} />
      </div>
      <UncontrolledTextarea label="Dirección" name="address" rows={3} defaultValue={clinic?.address ?? ""} />
      <UncontrolledTextarea label="Notas" name="notes" rows={3} defaultValue={clinic?.notes ?? ""} />
      {clinic?.id && (
        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <input type="checkbox" name="active" value="true" defaultChecked={clinic.active !== false} className="h-4 w-4 rounded border-[var(--line)] accent-[var(--navy)]" />
          Clínica activa (visible al crear albaranes)
        </label>
      )}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
