import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

export type ExtractedLine = {
  code: string;
  description: string;
  qty: string;
  price: string;
  discount: string;
};

export type ExtractedDeliveryNote = {
  patient_name: string;
  date: string;
  discount: string;
  lines: ExtractedLine[];
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patient_name: { type: Type.STRING, description: "Nom del pacient/client, buit si no apareix" },
    date: { type: Type.STRING, description: "Data del document tal com apareix, buit si no apareix" },
    discount: {
      type: Type.STRING,
      description:
        "Percentatge de descompte global aplicat al total del document, només el número (p. ex. '10' per a un 10%). Buit si no n'hi ha o si el descompte no és un percentatge.",
    },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "Codi de producte, buit si no n'hi ha" },
          description: { type: Type.STRING, description: "Descripció de la línia de producte/servei" },
          qty: { type: Type.STRING, description: "Quantitat com a text numèric, buit si no apareix" },
          price: { type: Type.STRING, description: "Preu unitari com a text numèric (sense símbol de moneda), buit si no apareix" },
          discount: {
            type: Type.STRING,
            description:
              "Percentatge de descompte aplicat específicament a aquesta línia, només el número (p. ex. '10' per a un 10%). Buit si no n'hi ha o si el descompte no és un percentatge.",
          },
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
- Si alguna línia té un descompte específic en percentatge, indica només el número (p. ex. "10" per a un 10%).
- Si hi ha un descompte global en percentatge aplicat al total del document (sovint prop del total o subtotal), indica només el número.
- Si un descompte del document és un import fix en diners en lloc d'un percentatge, deixa el camp de descompte corresponent buit — el sistema només admet descomptes en percentatge.

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
    discount: (parsed.discount ?? "").trim(),
    lines: (parsed.lines ?? []).map((l) => ({
      code: l.code ?? "",
      description: l.description ?? "",
      qty: normalizeNumber(l.qty),
      price: normalizeNumber(l.price),
      discount: (l.discount ?? "").trim(),
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
