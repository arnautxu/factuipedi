"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ExtractedLinesReview from "@/components/ExtractedLinesReview";
import type { ExtractedDeliveryNote } from "@/lib/ai/extractDeliveryNote";
import { uploadAndExtractAction } from "@/app/(app)/clientes/[id]/subir/actions";

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
      <Link href={`/clientes/${clientId}`} className="text-xs text-[var(--muted)] hover:underline">
        ← Tornar a la fitxa del client
      </Link>

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-8 text-center">
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
        <button
          type="button"
          disabled={state.status === "uploading"}
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)] disabled:opacity-50"
        >
          {state.status === "uploading" ? "Pujant i extraient…" : "Seleccionar PDF"}
        </button>

        {state.status === "error" && (
          <p className="text-sm text-red-600 mt-4 max-w-md mx-auto">{state.message}</p>
        )}
      </div>
    </div>
  );
}
