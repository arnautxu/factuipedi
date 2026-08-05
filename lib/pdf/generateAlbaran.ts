import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { TEMPLATE_B64 } from "./template";
import type { AlbaranHeader, LineItem } from "@/types/albaran";

// Motor de generació del PDF, portat gairebé literalment de l'index.html original.
// La plantilla (TEMPLATE_B64) i les coordenades (ROW_Y/COL/H) estan lligades exactament
// al disseny d'aquell PDF — si es canvia la plantilla cal recalcular totes les coordenades.

const PER_PAGE = 11;
const ROW_Y = [604.5, 584.7, 564.9, 545.1, 525.3, 505.5, 485.7, 465.9, 445.7, 425.9, 406.1];
const COL = { cod: 47, aantal: 347.6, prijs: 398.7, bedrag: 477.9 };
const OMS_X = 98.8;
const OMS_W = 340.6 - 98.8;

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

const lineTotal = (l: LineItem) => (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0);
const lineBedrag = (l: LineItem) => {
  const pv = parseFloat(l.price);
  return isFinite(pv) && l.price !== "" ? fmtNum(lineTotal(l)) : "";
};
const linePrijs = (l: LineItem) => {
  const pv = parseFloat(l.price);
  return isFinite(pv) && l.price !== "" ? fmtNum(pv) : l.priceText || "";
};

export async function generateAlbaranPdf(header: AlbaranHeader, lines: LineItem[]): Promise<Uint8Array> {
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
  set("klant_regel2", header.klant_regel2);

  const filled = lines.filter((l) => l.code || l.description);
  const overflow = filled.slice(PER_PAGE);
  const multipage = overflow.length > 0;

  const font = await doc.embedFont(StandardFonts.Helvetica);
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
    const ls = wrapAt(txt, 7);
    if (ls.length <= 1) {
      if (ls[0]) page.drawText(ls[0], { x: OMS_X, y: y0 + 5, size: 7, font, color: rgb(0, 0, 0) });
    } else {
      page.drawText(ls[0], { x: OMS_X, y: y0 + 12, size: 7, font, color: rgb(0, 0, 0) });
      page.drawText(ls[1], { x: OMS_X, y: y0 + 3, size: 7, font, color: rgb(0, 0, 0) });
    }
  };

  const draw = (p: import("pdf-lib").PDFPage, x: number, y: number, txt: unknown, size = 9) => {
    if (txt !== "" && txt != null) p.drawText(String(txt), { x, y, size, font, color: rgb(0, 0, 0) });
  };

  const drawRow = (page: import("pdf-lib").PDFPage, y0: number, l: LineItem) => {
    draw(page, COL.cod, y0 + 5, l.code);
    drawOms(page, y0, l.description);
    draw(page, COL.aantal, y0 + 5, l.qty);
    draw(page, COL.prijs, y0 + 5, linePrijs(l));
    draw(page, COL.bedrag, y0 + 5, lineBedrag(l));
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
      [313, 701.3, header.klant_regel2],
    ];
    H.forEach(([x, y, v]) => draw(page, x, y, v, 10));
  };

  const tot = filled.reduce((s, l) => s + lineTotal(l), 0);
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

  for (let pg = 0; pg < totalPages; pg++) {
    const isFirst = pg === 0;
    const isLast = pg === totalPages - 1;
    const page = isFirst ? p1 : doc.addPage([595.276, 841.89]);
    if (!isFirst && tmpl) {
      page.drawPage(tmpl);
      drawHeaderVals(page);
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
