"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import type { Client } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { ImportClientsModal } from "@/components/ImportClientsModal";

export function ClientsToolbar({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = () => {
    const rows = [
      ["Behandelaar", "Kliniek / adres", "In opdracht gemaakt van", "Notes"],
      ...clients.map((c) => [
        c.behandelaar ?? "",
        c.klant_regel2 ?? "",
        c.in_opdracht ?? "",
        c.notes ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    XLSX.writeFile(wb, "clients-noadentlab.xlsx");
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleExport}>
          Descargar Excel
        </Button>
        <Button variant="secondary" onClick={() => setImportOpen(true)}>
          Importar CSV
        </Button>
        <Link
          href="/clientes/nuevo"
          className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--navy)] transition-colors duration-150 ease-out hover:bg-[var(--navy-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-1"
        >
          + Nuevo paciente
        </Link>
      </div>

      <ImportClientsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </>
  );
}
