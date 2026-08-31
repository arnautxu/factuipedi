import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Clinic, DeliveryNote } from "@/types/database";

export type MonthlyInvoiceRow = Pick<DeliveryNote, "id" | "pakbonnummer" | "uitgiftedatum" | "inkomstdatum" | "naam_patient" | "total">;

const PAGE = { width: 595.28, height: 841.89, margin: 42 };
const ROWS_PER_PAGE = 24;
const NAVY = rgb(26 / 255, 48 / 255, 83 / 255);
const TEAL = rgb(50 / 255, 146 / 255, 151 / 255);
const MUTED = rgb(95 / 255, 108 / 255, 126 / 255);

const money = (value: number | null) => (value ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const noteDate = (note: MonthlyInvoiceRow) => note.uitgiftedatum || note.inkomstdatum || "Sin fecha";

function ellipsis(font: PDFFont, value: string, size: number, width: number) {
  if (font.widthOfTextAtSize(value, size) <= width) return value;
  let output = value;
  while (output.length && font.widthOfTextAtSize(`${output}...`, size) > width) output = output.slice(0, -1);
  return `${output}...`;
}

function text(page: PDFPage, font: PDFFont, value: string, x: number, y: number, size = 9, color = rgb(0, 0, 0), width?: number) {
  page.drawText(width ? ellipsis(font, value, size, width) : value, { x, y, size, font, color });
}

function datePlusThirtyDays(isoDate: string) {
  const input = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(input.getTime())) return "";
  input.setDate(input.getDate() + 30);
  return new Intl.DateTimeFormat("es-ES").format(input);
}

export async function generateMonthlyInvoicePdf({ clinic, period, notes, issuedAt = new Date() }: { clinic: Clinic; period: string; notes: MonthlyInvoiceRow[]; issuedAt?: Date }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const chunks = Array.from({ length: Math.max(1, Math.ceil(notes.length / ROWS_PER_PAGE)) }, (_, index) => notes.slice(index * ROWS_PER_PAGE, (index + 1) * ROWS_PER_PAGE));
  const issueDate = new Intl.DateTimeFormat("es-ES").format(issuedAt);
  const dueDate = datePlusThirtyDays(issuedAt.toISOString().slice(0, 10));
  const reference = `LIV-${period.replace(/[^\d]/g, "") || "SINFECHA"}-${clinic.id.slice(0, 6).toUpperCase()}`;
  const total = notes.reduce((sum, note) => sum + (note.total ?? 0), 0);

  chunks.forEach((rows, pageIndex) => {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: NAVY });
    text(page, bold, "LIVREXOTISMO", 42, height - 49, 21, rgb(1, 1, 1));
    text(page, regular, "Factura mensual de trabajos", 42, height - 68, 9, rgb(0.86, 0.93, 0.95));
    text(page, bold, "FACTURA MENSUAL", 387, height - 49, 12, rgb(1, 1, 1));
    text(page, regular, reference, 387, height - 66, 8, rgb(0.86, 0.93, 0.95), 165);

    text(page, bold, "Facturar a", 42, height - 124, 9, NAVY);
    text(page, bold, clinic.name, 42, height - 141, 10, NAVY, 250);
    const address = (clinic.address || "Dirección no indicada").split(/\n|,/).map((part) => part.trim()).filter(Boolean);
    address.slice(0, 2).forEach((line, index) => text(page, regular, line, 42, height - 157 - index * 12, 8.5, MUTED, 260));
    if (clinic.behandelaar) text(page, regular, clinic.behandelaar, 42, height - 181, 8.5, MUTED, 260);
    const detailsX = 365;
    [["Periodo", period], ["Emisión", issueDate], ["Vencimiento", dueDate], ["Referencia", reference]].forEach(([label, value], index) => {
      const y = height - 124 - index * 16;
      text(page, bold, label, detailsX, y, 8, MUTED);
      text(page, regular, value, detailsX + 70, y, 8.5, NAVY, 118);
    });

    const tableY = height - 218;
    const columns = [42, 72, 190, 275, 431];
    page.drawRectangle({ x: 42, y: tableY, width: 511, height: 21, color: TEAL });
    [["#", columns[0] + 8], ["ALBARÁN", columns[1]], ["FECHA", columns[2]], ["PACIENTE / REFERENCIA", columns[3]], ["IMPORTE", columns[4] + 12]].forEach(([label, x]) => text(page, bold, String(label), Number(x), tableY + 7, 7.5, rgb(1, 1, 1)));
    const rowHeight = 20;
    rows.forEach((note, index) => {
      const y = tableY - 1 - (index + 1) * rowHeight;
      if (index % 2 === 0) page.drawRectangle({ x: 42, y, width: 511, height: rowHeight, color: rgb(0.96, 0.98, 0.985) });
      page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 0.35, color: rgb(0.82, 0.86, 0.89) });
      text(page, regular, String(pageIndex * ROWS_PER_PAGE + index + 1), 50, y + 6, 8, MUTED);
      text(page, regular, note.pakbonnummer || note.id.slice(0, 8), 72, y + 6, 8, NAVY, 108);
      text(page, regular, noteDate(note), 190, y + 6, 8, NAVY, 76);
      text(page, regular, note.naam_patient || "Sin paciente", 275, y + 6, 8, NAVY, 145);
      const amount = money(note.total);
      text(page, bold, amount, 543 - bold.widthOfTextAtSize(amount, 8), y + 6, 8, NAVY);
    });
    if (pageIndex === chunks.length - 1) {
      const footerY = Math.min(128, tableY - rows.length * rowHeight - 34);
      page.drawLine({ start: { x: 42, y: footerY + 42 }, end: { x: 553, y: footerY + 42 }, thickness: 1, color: TEAL });
      text(page, regular, "Observaciones: factura mensual de trabajos realizados.", 42, footerY + 22, 8, MUTED, 315);
      text(page, regular, "Subtotal", 401, footerY + 26, 8, MUTED);
      text(page, bold, money(total), 543 - bold.widthOfTextAtSize(money(total), 11), footerY + 22, 11, NAVY);
      text(page, bold, "TOTAL MENSUAL", 401, footerY + 7, 8, NAVY);
    }
    text(page, regular, `Página ${pageIndex + 1} de ${chunks.length}`, 42, 28, 8, MUTED);
    text(page, regular, "LIVREXOTISMO · Factura mensual", 365, 28, 8, MUTED, 188);
  });
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
