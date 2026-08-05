import type { Client } from "@/types/database";
import { UncontrolledField, UncontrolledTextarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ClientForm({
  client,
  action,
  submitLabel,
}: {
  client?: Partial<Client>;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
        <UncontrolledField label="Naam patiënt" name="naam_patient" defaultValue={client?.naam_patient ?? ""} />
        <UncontrolledField
          label="Geboorte datum"
          name="geboortedatum"
          placeholder="dd-mm-jjjj"
          defaultValue={client?.geboortedatum ?? ""}
        />
        <UncontrolledField label="Behandelaar" name="behandelaar" defaultValue={client?.behandelaar ?? ""} />
        <UncontrolledField label="Kliniek / adres" name="klant_regel2" defaultValue={client?.klant_regel2 ?? ""} />
        <UncontrolledField
          label="In opdracht gemaakt van"
          name="in_opdracht"
          defaultValue={client?.in_opdracht ?? ""}
        />
      </div>
      <UncontrolledTextarea label="Notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} />
      <Button type="submit" variant="primary">
        {submitLabel}
      </Button>
    </form>
  );
}
