import { PDFDocument, StandardFonts, rgb, type PDFEmbeddedPage, type PDFFont, type PDFPage } from "pdf-lib";
import type { Clinic, DeliveryNote } from "@/types/database";

export type MonthlyInvoiceRow = Pick<DeliveryNote, "id" | "pakbonnummer" | "uitgiftedatum" | "inkomstdatum" | "naam_patient" | "total">;

const TEMPLATE_URL = "/monthly_invoice_note_livrexotismo.pdf";
const FIRST_PAGE_ROWS = 9;
const CONTINUATION_PAGE_ROWS = 15;
const INK = rgb(20 / 255, 20 / 255, 20 / 255);

const euro = (value: number | null) => (value ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const noteDate = (note: MonthlyInvoiceRow) => note.uitgiftedatum || note.inkomstdatum || "";

function date(value: Date) {
  return new Intl.DateTimeFormat("es-ES").format(value);
}

function dueDate(value: Date) {
  const next = new Date(value);
  next.setDate(next.getDate() + 30);
  return date(next);
}

function clipped(font: PDFFont, value: string, size: number, width: number) {
  if (font.widthOfTextAtSize(value, size) <= width) return value;
  let output = value;
  while (output.length && font.widthOfTextAtSize(`${output}...`, size) > width) output = output.slice(0, -1);
  return `${output}...`;
}

function write(page: PDFPage, font: PDFFont, value: string, x: number, y: number, width: number, size = 8.5, right = false) {
  if (!value) return;
  const text = clipped(font, value, size, width);
  const textX = right ? x + width - font.widthOfTextAtSize(text, size) : x;
  page.drawText(text, { x: textX, y, size, font, color: INK });
}

function addTemplatePage(doc: PDFDocument, template: PDFEmbeddedPage) {
  const page = doc.addPage([template.width, template.height]);
  page.drawPage(template, { x: 0, y: 0, width: template.width, height: template.height });
  return page;
}

function writeRows(page: PDFPage, font: PDFFont, notes: MonthlyInvoiceRow[], startAt: number, fieldY: number) {
  notes.forEach((note, index) => {
    const rowY = fieldY - index * 28;
    write(page, font, String(startAt + index + 1), 57, rowY, 65, 8);
    write(page, font, note.pakbonnummer || note.id.slice(0, 8).toUpperCase(), 132, rowY, 65, 7.6);
    write(page, font, noteDate(note), 207, rowY, 84, 7.6);
    write(page, font, note.naam_patient || "", 300, rowY, 136, 7.6);
    write(page, font, euro(note.total), 445, rowY, 82, 7.6, true);
  });
}

async function loadTemplate(templateBytes?: ArrayBuffer | Uint8Array) {
  if (templateBytes) return templateBytes;
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error("No se ha podido cargar la plantilla de factura mensual.");
  return response.arrayBuffer();
}

export async function generateMonthlyInvoicePdf({
  clinic,
  period,
  notes,
  issuedAt = new Date(),
  templateBytes,
}: {
  clinic: Clinic;
  period: string;
  notes: MonthlyInvoiceRow[];
  issuedAt?: Date;
  templateBytes?: ArrayBuffer | Uint8Array;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const source = await PDFDocument.load(await loadTemplate(templateBytes));
  const [firstTemplate, continuationTemplate] = await doc.embedPdf(source, [0, 1]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const firstRows = notes.slice(0, FIRST_PAGE_ROWS);
  const remainingRows = notes.slice(FIRST_PAGE_ROWS);
  const continuationCount = Math.max(1, Math.ceil(remainingRows.length / CONTINUATION_PAGE_ROWS));
  const total = notes.reduce((sum, note) => sum + (note.total ?? 0), 0);
  const reference = `LIV-${period.replace(/[^\d]/g, "") || "SINFECHA"}-${clinic.id.slice(0, 6).toUpperCase()}`;
  const clinicAddress = (clinic.address || "").replace(/\s*\n\s*/g, ", ");

  const firstPage = addTemplatePage(doc, firstTemplate);
  write(firstPage, regular, clinic.name, 401, 683, 129, 9);
  write(firstPage, regular, clinicAddress, 371, 661, 159, 8);
  write(firstPage, regular, date(issuedAt), 131, 557, 128, 8);
  write(firstPage, regular, period, 101, 537, 158, 8);
  write(firstPage, regular, clinic.id.slice(0, 8).toUpperCase(), 146, 517, 113, 8);
  write(firstPage, regular, reference, 421, 557, 109, 7.2);
  write(firstPage, regular, dueDate(issuedAt), 379, 537, 151, 8);
  writeRows(firstPage, regular, firstRows, 0, 428);
  write(firstPage, regular, euro(firstRows.reduce((sum, note) => sum + (note.total ?? 0), 0)), 446, 169, 84, 8, true);

  for (let pageIndex = 0; pageIndex < continuationCount; pageIndex += 1) {
    const page = addTemplatePage(doc, continuationTemplate);
    const rows = remainingRows.slice(pageIndex * CONTINUATION_PAGE_ROWS, (pageIndex + 1) * CONTINUATION_PAGE_ROWS);
    write(page, regular, clinic.name, 127, 681, 147, 8);
    write(page, regular, period, 97, 657, 177, 8);
    writeRows(page, regular, rows, FIRST_PAGE_ROWS + pageIndex * CONTINUATION_PAGE_ROWS, 608);
    if (pageIndex === continuationCount - 1) write(page, regular, euro(total), 446, 181, 84, 8, true);
  }

  return doc.save();
}

export function downloadMonthlyInvoicePdf(bytes: Uint8Array, period: string, clinicName: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `factura-mensual-${period}-${clinicName}`.replace(/[^\w.-]/g, "_") + ".pdf";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
