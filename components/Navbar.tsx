"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";

const LINKS = [
  { href: "/albaran/nuevo", label: "Nuevo albarán" },
  { href: "/clientes", label: "Pacientes" },
  { href: "/clinicas", label: "Clínicas" },
  { href: "/catalogo", label: "Catálogo" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-3 sm:px-5 min-h-14 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-[11px] bg-gradient-to-br from-[var(--teal)] to-[var(--navy)] grid place-items-center shrink-0">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="font-bold text-sm text-[var(--navy)] whitespace-nowrap">NoaDentLab</span>
        </div>

        <nav className="order-last sm:order-none flex w-full sm:w-auto items-center justify-between gap-0.5 sm:gap-1">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-1 ${
                  active
                    ? "bg-[var(--navy)] text-white"
                    : "text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction} className="shrink-0">
          <button
            type="submit"
            className="min-h-11 rounded-lg px-1.5 sm:px-2 py-1.5 text-xs font-medium whitespace-nowrap text-[var(--muted)] transition-colors duration-150 ease-out hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-1"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
