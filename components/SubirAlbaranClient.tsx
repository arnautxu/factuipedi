"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ExtractedLinesReview from "@/components/ExtractedLinesReview";
import type { ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import { uploadAndExtractAction } from "@/app/(app)/clientes/[id]/subir/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SubirAlbaranClient({ clientId }: { clientId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "uploading" }
    | { status: "error"; message: string }
    | { status: "ready"; documentId: string; extracted: ExtractedDeliveryNote }
  >({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setState({ status: "uploading" });
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAndExtractAction(clientId, formData);
    if ("error" in result) {
      setState({ status: "error", message: result.error });
      return;
    }
    setState({ status: "ready", documentId: result.documentId, extracted: result.extracted });
  };

  if (state.status === "ready") {
    return <ExtractedLinesReview clientId={clientId} documentId={state.documentId} extracted={state.extracted} />;
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/clientes/${clientId}`}
        className="rounded text-xs text-[var(--muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        ← Tornar a la fitxa del client
      </Link>

      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--muted)] mb-4">
          Puja un albarà en PDF rebut d&apos;un altre proveïdor. S&apos;extrauran les línies automàticament amb IA perquè les
          revisis abans de desar-les.
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
        <Button disabled={state.status === "uploading"} onClick={() => fileRef.current?.click()}>
          {state.status === "uploading" ? "Pujant i extraient…" : "Seleccionar PDF"}
        </Button>

        {state.status === "error" && (
          <p role="alert" className="animate-fade-slide-in text-sm text-red-600 mt-4 max-w-md mx-auto">
            {state.message}
          </p>
        )}
      </Card>
    </div>
  );
}
