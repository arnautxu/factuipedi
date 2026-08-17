import type { Client, Clinic } from "@/types/database";
import { UncontrolledField, UncontrolledTextarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ClientForm({
  client,
  clinics,
  action,
  submitLabel,
}: {
  client?: Partial<Client>;
  clinics: Clinic[];
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
        <UncontrolledField label="Paciente" name="naam_patient" defaultValue={client?.naam_patient ?? client?.behandelaar ?? ""} />
        <div>
          <label htmlFor="clinic_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Clínica</label>
          <select id="clinic_id" name="clinic_id" defaultValue={client?.clinic_id ?? ""} className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]">
            <option value="">Sin clínica asignada</option>
            {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">Gestiona las clínicas desde la nueva sección Clínicas.</p>
        </div>
        <UncontrolledField
          label="In opdracht gemaakt van"
          name="in_opdracht"
          defaultValue={client?.in_opdracht ?? ""}
        />
      </div>
      <UncontrolledTextarea label="Notas" name="notes" rows={3} defaultValue={client?.notes ?? ""} />
      <Button type="submit" variant="primary">
        {submitLabel}
      </Button>
    </form>
  );
}
