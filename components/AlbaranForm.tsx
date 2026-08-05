"use client";

import type { AlbaranHeader } from "@/types/albaran";
import { Field } from "@/components/ui/Field";

const FIELD: { key: keyof AlbaranHeader; label: string; date?: boolean }[] = [
  { key: "pakbonnummer", label: "Pakbonnummer" },
  { key: "inkomstdatum", label: "Inkomstdatum", date: true },
  { key: "uitgiftedatum", label: "Uitgiftedatum", date: true },
  { key: "naam_patient", label: "Naam patiënt" },
  { key: "geboortedatum", label: "Geboorte datum", date: true },
];

const FIELD2: { key: keyof AlbaranHeader; label: string }[] = [
  { key: "behandelaar", label: "Behandelaar" },
  { key: "klant_regel2", label: "Kliniek / adres" },
];

export default function AlbaranForm({
  header,
  onChange,
}: {
  header: AlbaranHeader;
  onChange: (header: AlbaranHeader) => void;
}) {
  const set = (key: keyof AlbaranHeader, value: string) => onChange({ ...header, [key]: value });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
      <div className="space-y-4">
        {FIELD.map((f) => (
          <Field
            key={f.key}
            id={`albaran-${f.key}`}
            label={f.label}
            placeholder={f.date ? "dd-mm-jjjj" : undefined}
            value={header[f.key]}
            onChange={(v) => set(f.key, v)}
          />
        ))}
      </div>
      <div className="space-y-4">
        {FIELD2.map((f) => (
          <Field
            key={f.key}
            id={`albaran-${f.key}`}
            label={f.label}
            value={header[f.key]}
            onChange={(v) => set(f.key, v)}
          />
        ))}
      </div>
    </div>
  );
}
