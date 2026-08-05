# NoaDentLab · Nota / Albarán

Aplicación web de página única (`index.html`), sin build ni dependencias de servidor, para generar notas de entrega / albaranes de un laboratorio dental (NoaDentLab).

## Stack

- HTML/CSS/JS vanilla, todo en un único archivo `index.html`.
- Librerías cargadas por CDN:
  - `pdf-lib` (cdnjs) → generación de PDF del albarán.
  - `xlsx` / SheetJS (cdnjs) → exportación/importación de datos en Excel.
- Sin framework, sin bundler. Se abre directamente en el navegador.

## Qué hace

- Formulario con datos del paciente/pedido (fechas en formato neerlandés: `Inkomstdatum`, `Uitgiftedatum`, `Geboorte datum` — el laboratorio trabaja con clientes en Países Bajos/Bélgica).
- Catálogo de productos/servicios buscable (por código o descripción) que se añade como líneas al albarán.
- Tabla de líneas editable: código, descripción, precio.
- Exportación a PDF (vía pdf-lib) y a Excel (vía xlsx).

## Convenciones

- Mantener todo el código en un único `index.html` (estilo actual), salvo que se pida explícitamente separar en varios ficheros.
- Los estilos usan variables CSS (`:root`) con paleta navy/teal — respetar la paleta existente al hacer cambios visuales.
- Etiquetas de formulario en neerlandés para los campos de fechas del paciente; el resto de la interfaz está en español.

## Cómo probarlo

No hay servidor ni build: abrir `index.html` directamente en el navegador (doble clic o `open index.html`).
