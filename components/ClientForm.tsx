import type { Client, Clinic } from "@/types/database";
import { UncontrolledField, UncontrolledTextarea } from "@/components/ui/Field";
import { SaveForm } from "@/components/ui/SaveForm";
import type { ActionResult } from "@/lib/ui/action-result";

export default function ClientForm({
  client,
  clinics,
  action,
  submitLabel,
}: {
  client?: Partial<Client>;
  clinics: Clinic[];
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}) {
  return (
    <SaveForm action={action} submitLabel={submitLabel}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
        <UncontrolledField required label="Paciente" name="naam_patient" defaultValue={client?.naam_patient ?? client?.behandelaar ?? ""} />
        <div>
          <label htmlFor="clinic_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Clínica</label>
          <select id="clinic_id" name="clinic_id" defaultValue={client?.clinic_id ?? ""} className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--focus)]">
            <option value="">Sin clínica asignada</option>
            {clinics.filter((clinic) => clinic.active !== false || clinic.id === client?.clinic_id).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}{clinic.active === false ? " (archivada)" : ""}</option>)}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">Las clínicas archivadas conservan sus pacientes e historial.</p>
        </div>
        <UncontrolledField
          label="In opdracht gemaakt van"
          name="in_opdracht"
          defaultValue={client?.in_opdracht ?? ""}
        />
      </div>
      <UncontrolledTextarea label="Notas" name="notes" rows={3} defaultValue={client?.notes ?? ""} />
    </SaveForm>
  );
}
