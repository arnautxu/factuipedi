"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActionFeedback, type Feedback } from "@/components/ui/ActionFeedback";
import type { Client } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { ImportClientsModal } from "@/components/ImportClientsModal";

export function ClientsToolbar({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true); setMessage(null);
    try {
    const XLSX = await import("xlsx");
    const rows = [
      ["Paciente", "Clínica", "Behandelaar", "Kliniek / dirección", "In opdracht gemaakt van", "Notas"],
      ...clients.map((c) => [
        c.naam_patient ?? "",
        c.clinic_id ?? "",
        c.behandelaar ?? "",
        c.klant_regel2 ?? "",
        c.in_opdracht ?? "",
        c.notes ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    ws["!cols"] = [{ wch: 28 }, { wch: 38 }, { wch: 24 }, { wch: 42 }, { wch: 30 }, { wch: 36 }];
    XLSX.writeFile(wb, "pacientes-noadentlab.xlsx", { bookType: "xlsx", compression: true });
    setMessage({ type: "success", text: "Excel preparado. Descarga iniciada." });
    } catch { setMessage({ type: "error", text: "No se ha podido generar el Excel. Vuelve a intentarlo." }); }
    finally { setExporting(false); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={exporting} onClick={handleExport}>
          {exporting ? "Generando…" : "Descargar Excel"}
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

      <ActionFeedback message={message} />
      {importOpen && <ImportClientsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />}
    </>
  );
}
