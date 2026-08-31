import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { TEMPLATE_B64 } from "./template";
import type { AlbaranHeader, LineItem } from "@/types/albaran";
import { applyDiscountToAmount, lineTotal } from "@/lib/albaran/pricing";

// Motor de generació del PDF, portat gairebé literalment de l'index.html original.
// La plantilla (TEMPLATE_B64) i les coordenades (ROW_Y/COL/H) estan lligades exactament
// al disseny d'aquell PDF — si es canvia la plantilla cal recalcular totes les coordenades.

const PER_PAGE = 11;
const ROW_Y = [604.5, 584.7, 564.9, 545.1, 525.3, 505.5, 485.7, 465.9, 445.7, 425.9, 406.1];
const COL = { cod: 47, aantal: 347.6, prijs: 398.7, korting: 446.5, bedrag: 496.2 };
const OMS_X = 98.8;
const OMS_W = 340.6 - 98.8;
const TABLE_HEADER_Y = 622;
const TABLE_HEADER_H = 22;
const TEMPLATE_BLUE = rgb(30 / 255, 71 / 255, 137 / 255);

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const fmtNum = (n: unknown) => {
  const v = parseFloat(String(n));
  return isFinite(v) ? v.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
};

const lineBedrag = (l: LineItem) => {
  const pv = parseFloat(l.price);
  return isFinite(pv) && l.price !== "" ? fmtNum(lineTotal(l)) : "";
};
const linePrijs = (l: LineItem) => {
  const pv = parseFloat(l.price);
  return isFinite(pv) && l.price !== "" ? fmtNum(pv) : l.priceText || "";
};

export async function generateAlbaranPdf(header: AlbaranHeader, lines: LineItem[], documentDiscount = ""): Promise<Uint8Array> {
  const doc = await PDFDocument.load(b64ToBytes(TEMPLATE_B64));
  const form = doc.getForm();
  const set = (name: string, val: unknown) => {
    try {
      form.getTextField(name).setText(String(val ?? ""));
    } catch {
      // el camp no existeix a la plantilla, s'ignora
    }
  };

  set("pakbonnummer", header.pakbonnummer);
  set("inkomstdatum", header.inkomstdatum);
  set("uitgiftedatum", header.uitgiftedatum);
  set("naam_patient", header.naam_patient);
  set("geboortedatum", header.geboortedatum);
  set("behandelaar", header.behandelaar);
  // Este campo de la plantilla solo admite una línea y tapa el texto dibujado.
  // Se colapsa su widget, conservando el resto de campos editables del PDF.
  try {
    const clinicAddressField = form.getTextField("klant_regel2");
    clinicAddressField.setText("");
    clinicAddressField.acroField.getWidgets().forEach((widget) =>
      widget.setRectangle({ x: 0, y: 0, width: 0, height: 0 })
    );
  } catch {
    // La plantilla puede no incluir el campo en versiones antiguas.
  }

  const filled = lines.filter((l) => l.code || l.description);
  const overflow = filled.slice(PER_PAGE);
  const multipage = overflow.length > 0;

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const p1 = doc.getPages()[0];

  let tmpl = null;
  if (multipage) {
    const bgDoc = await PDFDocument.load(b64ToBytes(TEMPLATE_B64));
    tmpl = await doc.embedPage(bgDoc.getPages()[0]);
  }

  const wrapAt = (txt: string, size: number) => {
    const words = String(txt || "").split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(test, size) <= OMS_W) cur = test;
      else {
        if (cur) out.push(cur);
        cur = w;
      }
      if (out.length === 2) break;
    }
    if (cur && out.length < 2) out.push(cur);
    return out.slice(0, 2);
  };

  const drawOms = (page: import("pdf-lib").PDFPage, y0: number, txt: string) => {
    const ls = wrapAt(txt, 9);
    if (ls.length <= 1) {
      if (ls[0]) page.drawText(ls[0], { x: OMS_X, y: y0 + 5, size: 9, font, color: rgb(0, 0, 0) });
    } else {
      page.drawText(ls[0], { x: OMS_X, y: y0 + 11, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(ls[1], { x: OMS_X, y: y0 + 1, size: 9, font, color: rgb(0, 0, 0) });
    }
  };

  const draw = (p: import("pdf-lib").PDFPage, x: number, y: number, txt: unknown, size = 9) => {
    if (txt !== "" && txt != null) p.drawText(String(txt), { x, y, size, font, color: rgb(0, 0, 0) });
  };

  const drawClinicText = (page: import("pdf-lib").PDFPage, x: number, y: number, text: string, size: number) => {
    if (!text) return;
    // Use a PDF-standard font here. The former embedded Borna subset rendered
    // as random symbols in some mobile and browser PDF viewers.
    page.drawText(text, { x, y, size, font, color: TEMPLATE_BLUE });
  };

  const drawRow = (page: import("pdf-lib").PDFPage, y0: number, l: LineItem) => {
    draw(page, COL.cod, y0 + 5, l.code);
    drawOms(page, y0, l.description);
    draw(page, COL.aantal, y0 + 5, l.qty);
    draw(page, COL.prijs, y0 + 5, linePrijs(l));
    draw(page, COL.korting, y0 + 5, l.discount ? `${l.discount.replace(/\s*%?\s*$/, "")}%` : "");
    draw(page, COL.bedrag, y0 + 5, lineBedrag(l));
  };

  const drawTableHeader = (page: import("pdf-lib").PDFPage) => {
    page.drawRectangle({ x: 340.6, y: TABLE_HEADER_Y, width: 211.5, height: TABLE_HEADER_H, color: rgb(0.33, 0.76, 0.78) });
    [340.6, 390.8, 438.8, 486.5].forEach((x) =>
      page.drawLine({ start: { x, y: TABLE_HEADER_Y + 4 }, end: { x, y: TABLE_HEADER_Y + TABLE_HEADER_H - 4 }, thickness: 1, color: rgb(1, 1, 1) })
    );
    const label = (text: string, x: number) => page.drawText(text, { x, y: 630, size: 8, font: boldFont, color: rgb(1, 1, 1) });
    label("Aantal", 351);
    label("Prij", 400);
    label("Korting", 444);
    label("Bedrag", 497);
  };

  // La plantilla reserva el rótulo a la izquierda y el valor de x=397 a x=552.
  const CLINIC_ADDRESS_X = 397;
  const CLINIC_ADDRESS_W = 150;
  const CLINIC_ADDRESS_SIZE = 10;
  const CLINIC_ADDRESS_LINE_HEIGHT = 10;
  const CLINIC_ADDRESS_MAX_LINES = 3;

  const wrapText = (text: string, width: number, size: number, maxLines: number) => {
    const lines: string[] = [];
    let line = "";

    const addWord = (word: string) => {
      if (font.widthOfTextAtSize(word, size) <= width) return [word];
      const parts: string[] = [];
      let part = "";
      for (const character of word) {
        const candidate = part + character;
        if (part && font.widthOfTextAtSize(candidate, size) > width) {
          parts.push(part);
          part = character;
        } else {
          part = candidate;
        }
      }
      if (part) parts.push(part);
      return parts;
    };

    const words = text.trim().split(/\s+/).flatMap(addWord);
    let truncated = false;
    for (let index = 0; index < words.length; index++) {
      const word = words[index];
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
        if (lines.length === maxLines) {
          truncated = true;
          break;
        }
      }
    }
    if (line && lines.length < maxLines) lines.push(line);

    if (truncated) {
      let lastLine = lines[maxLines - 1];
      while (lastLine && font.widthOfTextAtSize(`${lastLine}…`, size) > width) lastLine = lastLine.slice(0, -1);
      lines[maxLines - 1] = `${lastLine}…`;
    }
    return lines;
  };

  const drawClinicAddress = (page: import("pdf-lib").PDFPage) => {
    drawClinicText(page, 313, 701.3, "Kliniek / adres", 10);
    const clinicLines = wrapText(header.in_opdracht, CLINIC_ADDRESS_W, CLINIC_ADDRESS_SIZE, 1);
    const addressLines = wrapText(
      header.klant_regel2,
      CLINIC_ADDRESS_W,
      CLINIC_ADDRESS_SIZE,
      CLINIC_ADDRESS_MAX_LINES - clinicLines.length
    );
    [...clinicLines, ...addressLines].forEach((line, index) => {
      drawClinicText(page, CLINIC_ADDRESS_X, 701.3 - index * CLINIC_ADDRESS_LINE_HEIGHT, line, CLINIC_ADDRESS_SIZE);
    });
  };

  const drawHeaderVals = (page: import("pdf-lib").PDFPage) => {
    const H: [number, number, string][] = [
      [452, 781.9, header.pakbonnummer],
      [125, 718.2, header.pakbonnummer],
      [125, 701.3, header.inkomstdatum],
      [125, 684.0, header.uitgiftedatum],
      [121, 667.1, header.naam_patient],
      [462, 667.1, header.geboortedatum],
      [379, 718.2, header.behandelaar],
    ];
    H.forEach(([x, y, v]) => draw(page, x, y, v, 10));
    drawClinicAddress(page);
  };

  const tot = applyDiscountToAmount(filled.reduce((s, l) => s + lineTotal(l), 0), documentDiscount);
  const drawFooterVals = (page: import("pdf-lib").PDFPage) => {
    draw(page, 463, 388.9, "€ " + fmtNum(tot), 10);
    draw(page, 78, 353, header.kleur, 10);
    draw(page, 174, 233.5, header.in_opdracht, 10);
  };

  const totalPages = Math.max(1, Math.ceil(filled.length / PER_PAGE));

  form.acroForm.dict.delete(PDFName.of("CO"));
  form.acroForm.dict.delete(PDFName.of("NeedAppearances"));
  form.getFields().forEach((f) => f.acroField.dict.delete(PDFName.of("AA")));
  form.updateFieldAppearances();
  drawClinicAddress(p1);
  drawTableHeader(p1);

  for (let pg = 0; pg < totalPages; pg++) {
    const isFirst = pg === 0;
    const isLast = pg === totalPages - 1;
    const page = isFirst ? p1 : doc.addPage([595.276, 841.89]);
    if (!isFirst && tmpl) {
      page.drawPage(tmpl);
      drawHeaderVals(page);
      drawTableHeader(page);
    }
    const chunk = filled.slice(pg * PER_PAGE, (pg + 1) * PER_PAGE);
    chunk.forEach((l, i) => drawRow(page, ROW_Y[i], l));
    if (isLast) drawFooterVals(page);
    if (totalPages > 1) {
      const label = "Pagina " + (pg + 1) + " van " + totalPages;
      const w = font.widthOfTextAtSize(label, 9);
      page.drawText(label, { x: 297.6 - w / 2, y: 40, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    }
  }

  return doc.save();
}

export function albaranTotal(lines: LineItem[]): number {
  return lines.filter((l) => l.code || l.description).reduce((s, l) => s + lineTotal(l), 0);
}

export function downloadPdf(bytes: Uint8Array, pakbonnummer: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nr = pakbonnummer.trim();
  a.download = "Nota" + (nr ? "_" + nr.replace(/[^\w.-]/g, "_") : "") + ".pdf";
  document.body.appendChild(a);
  try {
    a.click();
  } catch {
    window.open(url, "_blank");
  }
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
