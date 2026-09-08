import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

const BASE =
  "min-h-11 rounded-lg text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-1 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS = {
  primary: "px-4 py-2 text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)]",
  secondary: "px-3 py-2 border border-[var(--line)] bg-white hover:bg-slate-50",
  danger: "px-3 py-2 border border-[var(--line)] bg-white text-red-600 hover:bg-red-50",
};

export function Button({ variant = "primary", type = "button", className = "", ...props }: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
