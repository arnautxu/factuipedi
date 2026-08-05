import type { Client } from "@/types/database";

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
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
            Naam patiënt
          </label>
          <input
            name="naam_patient"
            defaultValue={client?.naam_patient ?? ""}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
            Geboorte datum
          </label>
          <input
            name="geboortedatum"
            placeholder="dd-mm-jjjj"
            defaultValue={client?.geboortedatum ?? ""}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
            Behandelaar
          </label>
          <input
            name="behandelaar"
            defaultValue={client?.behandelaar ?? ""}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
            Kliniek / adres
          </label>
          <input
            name="klant_regel2"
            defaultValue={client?.klant_regel2 ?? ""}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
            In opdracht gemaakt van
          </label>
          <input
            name="in_opdracht"
            defaultValue={client?.in_opdracht ?? ""}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)]"
      >
        {submitLabel}
      </button>
    </form>
  );
}
