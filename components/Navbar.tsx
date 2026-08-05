"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";

const LINKS = [
  { href: "/albaran/nuevo", label: "Nou albarà" },
  { href: "/clientes", label: "Clients" },
  { href: "/catalogo", label: "Catàleg" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[11px] bg-gradient-to-br from-[#4FBEC4] to-[#1E4789] grid place-items-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="font-bold text-sm text-[#1E4789]">NoaDentLab</span>
        </div>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-[#1E4789] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            Sortir
          </button>
        </form>
      </div>
    </header>
  );
}
