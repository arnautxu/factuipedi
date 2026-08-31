import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getDeliveryNoteDocumentUrl, getImportedWork, getUploadedDocument } from "@/lib/supabase/queries";

export default async function ImportedWorkPage({ params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const work = await getImportedWork(workId);
  if (!work || work.client_id !== id) notFound();
  const document = await getUploadedDocument(work.uploaded_document_id);
  const pdfUrl = document ? await getDeliveryNoteDocumentUrl(document.storage_path) : null;
  const extracted = work.extracted_payload as { lines?: { code?: string; description?: string; qty?: string; price?: string }[] };

  return (
    <div className="space-y-4">
      <Link href={`/clientes/${id}`} className="text-xs text-[var(--muted)] hover:underline">← Volver a la ficha del paciente</Link>
      <div>
        <h1 className="text-lg font-bold text-[var(--navy)]">Trabajo importado</h1>
        <p className="text-sm text-[var(--muted)]">{work.external_code || "Sin código externo"}</p>
      </div>
      <Card className="grid gap-3 p-5 text-sm sm:grid-cols-2">
        <p><span className="text-[var(--muted)]">Estado:</span> {work.status}</p>
        <p><span className="text-[var(--muted)]">Fecha:</span> {work.document_date || "—"}</p>
        <p><span className="text-[var(--muted)]">Creado por:</span> {work.created_by}</p>
        <p><span className="text-[var(--muted)]">Modificado por:</span> {work.updated_by}</p>
        {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] hover:underline">Ver PDF original</a>}
      </Card>
      {work.alerts.length > 0 && <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p className="font-semibold">Alertas</p><ul className="mt-2 list-disc pl-5">{work.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></Card>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm"><thead><tr className="border-b border-[var(--line)] text-left text-xs uppercase text-[var(--muted)]"><th className="px-4 py-3">Código</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Precio</th></tr></thead><tbody>{(extracted.lines ?? []).map((line, index) => <tr key={index} className="border-b border-[var(--line-soft)] last:border-0"><td className="px-4 py-3">{line.code || "—"}</td><td className="px-4 py-3">{line.description || "—"}</td><td className="px-4 py-3">{line.qty || "—"}</td><td className="px-4 py-3">{line.price || "—"}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}
