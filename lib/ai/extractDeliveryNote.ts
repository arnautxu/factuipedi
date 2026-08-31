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
  external_code: string;
  patient_name: string;
  date: string;
  discount: string;
  lines: ExtractedLine[];
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    external_code: { type: Type.STRING, description: "Número o código externo único del albarán/factura, vacío si no aparece" },
    patient_name: { type: Type.STRING, description: "Nombre del paciente/cliente, vacío si no aparece" },
    date: { type: Type.STRING, description: "Fecha del documento tal como aparece, vacía si no aparece" },
    discount: {
      type: Type.STRING,
      description:
        "Porcentaje de descuento global aplicado al total del documento, solo el número (p. ej. '10' para un 10%). Vacío si no hay o si el descuento no es un porcentaje.",
    },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "Código de producto, vacío si no tiene" },
          description: { type: Type.STRING, description: "Descripción de la línea de producto/servicio" },
          qty: { type: Type.STRING, description: "Cantidad como texto numérico, vacía si no aparece" },
          price: { type: Type.STRING, description: "Precio unitario como texto numérico (sin símbolo de moneda), vacío si no aparece" },
          discount: {
            type: Type.STRING,
            description:
              "Porcentaje de descuento aplicado específicamente a esta línea, solo el número (p. ej. '10' para un 10%). Vacío si no hay o si el descuento no es un porcentaje.",
          },
        },
        required: ["description"],
      },
    },
  },
  required: ["lines"],
};

const PROMPT = `Eres un asistente que extrae datos estructurados de albaranes/notas de entrega de un laboratorio dental recibidos de proveedores externos. El documento puede estar en neerlandés, español o inglés, y el diseño varía según el proveedor.

Extrae:
- El número o código externo único del albarán o factura. No uses códigos de producto; deja el campo vacío si no aparece.
- El nombre del paciente/cliente si aparece.
- La fecha del documento si aparece.
- Todas las líneas de producto/servicio con su código (si tiene), descripción, cantidad y precio unitario.
- Si alguna línea tiene un descuento específico en porcentaje, indica solo el número (p. ej. "10" para un 10%).
- Si hay un descuento global en porcentaje aplicado al total del documento (a menudo cerca del total o subtotal), indica solo el número.
- Si un descuento del documento es un importe fijo en dinero en lugar de un porcentaje, deja el campo de descuento correspondiente vacío — el sistema solo admite descuentos en porcentaje.

Si un campo no aparece en el documento, déjalo como cadena vacía. No inventes datos que no estén. Devuelve solo las líneas que representan productos o servicios facturables, no totales ni subtotales.`;

const MAX_EXTRACTION_ATTEMPTS = 3;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isTemporaryModelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|UNAVAILABLE|high demand|temporar/i.test(message);
}

export async function extractDeliveryNoteFromPdf(pdfBytes: Uint8Array): Promise<ExtractedDeliveryNote> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const base64 = Buffer.from(pdfBytes).toString("base64");

  let response;
  for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt += 1) {
    try {
      response = await ai.models.generateContent({
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
      break;
    } catch (error) {
      if (!isTemporaryModelError(error) || attempt === MAX_EXTRACTION_ATTEMPTS) {
        if (isTemporaryModelError(error)) {
          throw new Error("El servicio de extracción está temporalmente saturado. El PDF se ha guardado; inténtalo de nuevo en unos minutos.");
        }
        throw error;
      }
      await wait(attempt * 1_000);
    }
  }

  const text = response?.text;
  if (!text) throw new Error("Gemini no ha devuelto ninguna respuesta");

  const parsed = JSON.parse(text) as ExtractedDeliveryNote;
  return {
    external_code: (parsed.external_code ?? "").trim(),
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
