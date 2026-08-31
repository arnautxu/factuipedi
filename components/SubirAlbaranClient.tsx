"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ExtractedLinesReview from "@/components/ExtractedLinesReview";
import type { ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import type { ImportedWork } from "@/types/database";
import { uploadAndExtractAction } from "@/app/(app)/clientes/[id]/subir/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/spinner-1";

export default function SubirAlbaranClient({ clientId }: { clientId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "uploading" }
    | { status: "error"; message: string; pdfUrl?: string }
    | { status: "ready"; documentId: string; pdfUrl: string; work: ImportedWork; extracted: ExtractedDeliveryNote }
  >({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setState({ status: "error", message: "Selecciona un archivo PDF." });
      return;
    }
    setState({ status: "uploading" });
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadAndExtractAction(clientId, formData);
      if ("error" in result) {
        setState({ status: "error", message: result.error, pdfUrl: result.pdfUrl });
        return;
      }
      setState({ status: "ready", documentId: result.documentId, pdfUrl: result.pdfUrl, work: result.work, extracted: result.extracted });
    } catch (err) {
      setState({ status: "error", message: "No se ha podido procesar el PDF: " + (err instanceof Error ? err.message : String(err)) });
    }
  };

  if (state.status === "ready") {
    return <ExtractedLinesReview clientId={clientId} documentId={state.documentId} pdfUrl={state.pdfUrl} work={state.work} extracted={state.extracted} />;
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/clientes/${clientId}`}
        className="rounded text-xs text-[var(--muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        ← Volver a la ficha del paciente
      </Link>

      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--muted)] mb-4">
          Sube un albarán en PDF recibido de otro proveedor. Se extraerán las líneas automáticamente con IA para que las
          revises antes de guardarlas.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button className="inline-flex items-center gap-2" disabled={state.status === "uploading"} onClick={() => fileRef.current?.click()}>
          {state.status === "uploading" && <Spinner size={16} invert aria-hidden="true" />}
          {state.status === "uploading" ? "Subiendo y extrayendo…" : "Seleccionar PDF"}
        </Button>

        {state.status === "error" && (
          <div role="alert" className="animate-fade-slide-in mt-4 max-w-md text-sm text-red-600 mx-auto">
            <p>{state.message}</p>
            {state.pdfUrl && <a href={state.pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold underline">Ver PDF conservado</a>}
          </div>
        )}
      </Card>
    </div>
  );
}
