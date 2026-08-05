# NoaDentLab · Nota / Albarán

Aplicación web para generar y gestionar notas de entrega / albaranes de un laboratorio dental (NoaDentLab), con base de datos de clientes y catálogo de productos.

## Stack

- Next.js 16 (App Router, TypeScript), desplegado en Vercel.
- Supabase (Postgres + Storage) como base de datos: clientes, catálogo de productos, albaranes (`delivery_notes`/`delivery_note_lines`) y documentos PDF subidos (`uploaded_documents`). Acceso exclusivamente server-side con la `service-role key` (nunca expuesta al cliente); RLS activado con todas las tablas bloqueadas para `anon`/`authenticated`.
- `pdf-lib` → generación del PDF del albarán (plantilla AcroForm embebida en `lib/pdf/template.ts` + dibujo manual de líneas, portado tal cual de la versión anterior de la app).
- `xlsx` / SheetJS → exportación/importación del catálogo en Excel.
- `@google/genai` (Gemini, modelo `gemini-flash-latest`) → extracción estructurada de datos de albaranes externos en PDF.
- Autenticación: login simple (usuario/contraseña únicos compartidos) con sesión en cookie firmada (`jose`), sin Supabase Auth.

## Estructura

- `app/(auth)/login` — login público.
- `app/(app)/` — rutas protegidas por `proxy.ts` (middleware): `albaran/nuevo`, `clientes`, `clientes/[id]`, `clientes/[id]/subir`, `catalogo`.
- `lib/supabase/` — `admin.ts` (cliente con service-role key) y `queries.ts` (toda la capa de acceso a datos).
- `lib/pdf/generateAlbaran.ts` — motor de generación del PDF (client-side).
- `lib/catalog/` — parsers de `.xlsx` y catálogo incrustado de fallback.
- `lib/ai/extractDeliveryNote.ts` — extracción con Gemini.
- `supabase/migrations/` — esquema SQL (aplicar manualmente en el SQL Editor de Supabase; no hay CLI de Supabase enlazada en este entorno).
- `public/legacy.html` — versión anterior de un solo archivo, conservada como referencia/rollback.

## Qué hace

- Formulario de albarán con datos del paciente/pedido (fechas en formato neerlandés: `Inkomstdatum`, `Uitgiftedatum`, `Geboorte datum`).
- Selector de cliente existente que autocompleta el formulario; cada albarán generado se guarda vinculado al cliente.
- Catálogo editable desde la app (añadir, editar, eliminar, reordenar productos), con exportación/importación en Excel — ya no depende de Google Sheets.
- Subida de albaranes externos en PDF: extracción de líneas con IA, revisión manual antes de guardar, vinculados a la fitxa del cliente.
- Generación de factura combinada: selecciona varios albaranes de un cliente y genera un PDF conjunto.

## Convenciones

- Los estilos usan variables CSS (`:root` en `app/globals.css`) con paleta navy/teal — respetar la paleta existente al hacer cambios visuales.
- Etiquetas de formulario en neerlandés para los campos de fecha del paciente; el resto de la interfaz está en español/catalán.
- Las fechas (`geboortedatum`, `inkomstdatum`, `uitgiftedatum`) se guardan como texto libre `dd-mm-jjjj`, no como `date` de Postgres, para evitar ambigüedad de interpretación.
- Los hashes de contraseña (bcrypt) en archivos `.env*` deben escaparse (`\$` en vez de `$`) — Next.js interpola variables `$...` en `.env` incluso entre comillas.

## Cómo probarlo

```bash
npm install
npm run dev
```

Requiere un `.env.local` con las variables de `.env.example` (Supabase, `GEMINI_API_KEY`, login). Sin `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` configurados, el catálogo cae automáticamente al catálogo incrustado y las páginas que dependen de clientes fallarán.
