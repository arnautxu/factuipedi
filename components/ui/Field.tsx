"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  id?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Field({ label, value, onChange, placeholder, name, id, type }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
      />
    </div>
  );
}

type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
} & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "placeholder">;

export function TextareaField({ label, value, onChange, name, id, rows = 3, placeholder }: TextareaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
        {label}
      </label>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
      />
    </div>
  );
}

type UncontrolledFieldProps = {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
};

export function UncontrolledField({ label, name, defaultValue, placeholder, id, required }: UncontrolledFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
      />
    </div>
  );
}

type UncontrolledTextareaProps = {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  id?: string;
} & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">;

export function UncontrolledTextarea({ label, name, defaultValue, rows, id }: UncontrolledTextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
        {label}
      </label>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition-shadow duration-150 ease-out focus:ring-2 focus:ring-[var(--focus)]"
      />
    </div>
  );
}
