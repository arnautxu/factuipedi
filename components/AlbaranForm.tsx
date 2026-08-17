"use client";

import type { AlbaranHeader } from "@/types/albaran";
import { Field } from "@/components/ui/Field";

const FIELD: { key: keyof AlbaranHeader; label: string; date?: boolean }[] = [
  { key: "pakbonnummer", label: "Pakbonnummer" },
  { key: "inkomstdatum", label: "Inkomstdatum", date: true },
  { key: "uitgiftedatum", label: "Uitgiftedatum", date: true },
  { key: "geboortedatum", label: "Geboorte datum", date: true },
];

export default function AlbaranForm({
  header,
  onChange,
}: {
  header: AlbaranHeader;
  onChange: (header: AlbaranHeader) => void;
}) {
  const set = (key: keyof AlbaranHeader, value: string) => onChange({ ...header, [key]: value });
  const toDateInput = (value: string) => {
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  };
  const fromDateInput = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  };

  return (
    <div className="grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
      {FIELD.map((f) => (
        <Field
          key={f.key}
          id={`albaran-${f.key}`}
          label={f.label}
          type={f.date ? "date" : undefined}
          value={f.date ? toDateInput(header[f.key]) : header[f.key]}
          onChange={(v) => set(f.key, f.date ? fromDateInput(v) : v)}
        />
      ))}
    </div>
  );
}
