import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

export type ExtractedLine = {
  code: string;
  description: string;
  qty: string;
  price: string;
};

export type ExtractedDeliveryNote = {
  patient_name: string;
  date: string;
  lines: ExtractedLine[];
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patient_name: { type: Type.STRING, description: "Nom del pacient/client, buit si no apareix" },
    date: { type: Type.STRING, description: "Data del document tal com apareix, buit si no apareix" },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "Codi de producte, buit si no n'hi ha" },
          description: { type: Type.STRING, description: "Descripció de la línia de producte/servei" },
          qty: { type: Type.STRING, description: "Quantitat com a text numèric, buit si no apareix" },
          price: { type: Type.STRING, description: "Preu unitari com a text numèric (sense símbol de moneda), buit si no apareix" },
        },
        required: ["description"],
      },
    },
  },
  required: ["lines"],
};

const PROMPT = `Ets un assistent que extreu dades estructurades d'albarans/notes de lliurament d'un laboratori dental rebuts de proveïdors externs. El document pot estar en neerlandès, espanyol o anglès, i el disseny varia segons el proveïdor.

Extreu:
- El nom del pacient/client si apareix.
- La data del document si apareix.
- Totes les línies de producte/servei amb el seu codi (si en té), descripció, quantitat i preu unitari.

Si un camp no apareix al document, deixa'l com a cadena buida. No inventis dades que no hi siguin. Retorna només les línies que representen productes o serveis facturables, no totals ni subtotals.`;

export async function extractDeliveryNoteFromPdf(pdfBytes: Uint8Array): Promise<ExtractedDeliveryNote> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const base64 = Buffer.from(pdfBytes).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: "application/pdf", data: base64 } }, { text: PROMPT }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini no ha retornat cap resposta");

  const parsed = JSON.parse(text) as ExtractedDeliveryNote;
  return {
    patient_name: parsed.patient_name ?? "",
    date: parsed.date ?? "",
    lines: (parsed.lines ?? []).map((l) => ({
      code: l.code ?? "",
      description: l.description ?? "",
      qty: normalizeNumber(l.qty),
      price: normalizeNumber(l.price),
    })),
  };
}

// Gemini pot retornar números amb coma decimal (format europeu, p.ex. "465,00")
// o amb símbol de moneda; els normalitzem a un format que parseFloat interpreti bé.
function normalizeNumber(raw: string | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[€\s]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isFinite(n) ? String(n) : "";
}
