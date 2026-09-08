# Auditoria UX/UI — NoaDentLab

Data: 8 de setembre de 2026. Abast: implementació local actual, inclosos els canvis previs presents al checkout. Revisió estàtica de components, accions i migracions; no s'han executat operacions amb dades reals ni proves visuals autenticades. No s'ha modificat l'aplicació. Les conclusions sobre la base de dades descriuen les migracions del repositori, no una inspecció de l'esquema de producció.

## Veredicte

La identitat navy/teal i els components compartits són coherents amb una eina de gestió. El problema principal és la confiança en les accions: falta informar què s'està guardant, què s'ha guardat i quines conseqüències té eliminar o filtrar. El detector mecànic no ha trobat incidències en els cinc components revisats; això no valida els fluxos ni l'accessibilitat completa.

Puntuació orientativa de codi, no certificació visual o WCAG:

| Dimensió | Punts | Evidència |
|---|---:|---|
| Accessibilitat | 2/4 | Labels i dialog natius; feedback i validació incomplets |
| Rendiment | 2/4 | XLSX i generadors PDF importats inicialment; impacte pendent de mesurar |
| Adaptació | 2/4 | Grids adaptatius, però controls petits i taula mensual de 680 px |
| Theming | 3/4 | Tokens compartits; diversos blancs i colors d'estat directes |
| Integritat de la interacció | 1/4 | Visibilitat, eliminació i exportació no expliquen tot l'efecte |
| **Total** | **10/20** | **Cal treball significatiu en els fluxos** |

10 troballes: 0 P0, 5 P1, 5 P2. No s'assigna P0 perquè no s'ha reproduït un bloqueig total.

## Troballes prioritzades

### 1. P1 — El checkbox de clínica amaga més del que diu

`components/ClinicForm.tsx:14`, `app/(app)/clinicas/actions.ts:22`, `lib/supabase/queries.ts:109`, `app/(app)/clinicas/page.tsx:6`.

La descripció diu «visible al crear albaranes», però desmarcar i guardar també exclou la clínica del llistat de gestió. No s'esborra: queda accessible per URL directa, sense filtre d'inactives ni recuperació visible. És fàcil interpretar que s'ha perdut.

Proposta segons la intenció de l'usuari: retirar el checkbox i posar una acció explícita «Eliminar clínica», separada de «Guardar cambios». Diàleg amb nom de la clínica i conseqüències concretes; botons «Cancelar» / «Eliminar clínica»; estat «Eliminando…» i resultat «Clínica eliminada».

Cal definir l'eliminació amb historial: les migracions fan `ON DELETE SET NULL` en pacients i albarans. Una eliminació física pot desvincular l'historial de la clínica i afectar l'accés a la facturació mensual. Recomanació: eliminar definitivament clíniques sense dependències i, per a les que tenen historial, oferir una baixa conservant-lo, identificada honestament com «Archivar clínica», amb accés i restauració. No limitar-se a canviar l'etiqueta del checkbox.

Categoria: integritat/prevenció d'errors. Acció: `/shape`, `/clarify`, `/harden`.

### 2. P1 — Guardar clíniques i pacients no té feedback local

`components/ClinicForm.tsx:20`, `components/ClientForm.tsx:39`, `app/(app)/clinicas/actions.ts:22`, `app/(app)/clientes/actions.ts:31`.

Els formularis no connecten l'estat pendent amb el botó, no mostren èxit i no gestionen errors al costat del formulari. La revalidació no comunica a l'usuari que s'ha desat. Les altes redirigeixen sense confirmació explícita.

Afegir «Guardando…», bloqueig durant la petició, missatge accessible `role="status"` en èxit i error recuperable amb `role="alert"`, preservant els valors. No cal un diàleg previ per cada guardat ordinari.

Categoria: accessibilitat/feedback. Acció: `/harden`.

### 3. P1 — La factura mensual pot ser parcial sense advertir-ho al botó

`components/ClinicMonthlyNotes.tsx:32`, `:36`, `:49`, `:77`.

Els grups es construeixen amb els treballs filtrats per estat. PDF, Excel i CSV reben aquests grups: filtrar «Pendiente» produeix un document amb només pendents, amb l'etiqueta genèrica «Descargar factura PDF».

Mostrar abast abans de generar: «Exportar 8 trabajos filtrados · 420 €», i distingir-ho de «Factura del mes completo». Incloure estat/abast al document si es permet una exportació parcial. En canviar l'estat d'un treball que deixa de complir el filtre, informar que s'ha actualitzat i explicar per què desapareix.

Categoria: integritat/prevenció d'errors. Acció: `/clarify`, `/harden`.

### 4. P1 — Eliminar pacient descriu una conseqüència diferent de l'esquema

`components/DeleteClientButton.tsx:28`, `lib/supabase/queries.ts:167`, `supabase/migrations/0001_init.sql:34`.

El diàleg afirma que s'elimina tot l'historial d'albarans. L'acció esborra el pacient, mentre que la FK dels albarans indica `ON DELETE SET NULL`. Altres registres vinculats tenen cascada. El missatge no descriu aquesta combinació.

Verificar l'esquema desplegat i fer coincidir el contracte d'eliminació, el text i l'accés posterior a l'historial. El nom del pacient ja apareix al diàleg: conservar-lo.

Categoria: integritat. Acció: `/harden`, `/clarify`.

### 5. P1 — Clínica inactiva absent del selector d'un pacient existent

`app/(app)/clientes/[id]/page.tsx:41`, `components/ClientForm.tsx:24`, `lib/supabase/queries.ts:109`.

La fitxa carrega només clíniques actives, però el pacient pot conservar l'ID d'una clínica desactivada. El `select` no conté cap opció amb aquell valor. Hi ha risc de mostrar o enviar una assignació buida en un guardat posterior; cal reproduir el comportament exacte al navegador.

Incloure sempre l'assignació actual amb una etiqueta d'arxivada, i canviar-la només per una decisió explícita de l'usuari.

Categoria: integritat de formularis. Acció: `/harden`.

### 6. P2 — Estats pendents i confirmacions inconsistents

`components/DeleteClientButton.tsx:29`, `components/ui/ConfirmDialog.tsx:52`, `components/CatalogoClient.tsx:82`, `components/EditAlbaranClient.tsx:101`.

El diàleg d'eliminar pacient canvia el text però no desactiva la confirmació. Al catàleg hi ha accions que no bloquegen el control durant la petició. Guardar i descarregar l'albarà tenen flags independents encara que totes dues accions escriuen dades.

Estat pendent compartit per operacions sobre la mateixa entitat, bloqueig de repetició i error visible al context de l'acció. Èxit explícit també després d'editar albarans i productes. Identificar la descàrrega que també guarda com «Guardar y descargar PDF».

Categoria: feedback/integritat. Acció: `/harden`, `/clarify`.

### 7. P2 — Validació tardana i pèrdua potencial d'edicions

`components/ui/Field.tsx:82`, `components/ClinicForm.tsx:9`, `app/(app)/clinicas/actions.ts:8`, `components/EditAlbaranClient.tsx:84`.

El nom de clínica no és obligatori al formulari i el servidor només fa trim; `NOT NULL` no rebutja una cadena buida. No s'ha trobat protecció general de canvis sense guardar als formularis revisats.

Validar camps imprescindibles a client i servidor, amb error al camp i focus. Avisar en sortir només quan hi ha modificacions pendents. Conservar la confirmació existent per reiniciar un albarà nou.

Categoria: formularis/accessibilitat. Acció: `/harden`.

### 8. P2 — Reordenació optimista sense restauració en error

`components/CatalogoClient.tsx:109`.

La UI canvia l'ordre abans de guardar-lo; si falla, només apareix un missatge i l'ordre visible es manté. L'usuari pot treballar amb un ordre que no és persistent.

Restaurar l'ordre anterior o recarregar la font autoritativa en error, i comunicar el resultat.

Categoria: integritat. Acció: `/harden`.

### 9. P2 — Controls compactes i accions allunyades en pantalla estreta

`components/ui/Button.tsx:11`, `components/DeleteClientButton.tsx:21`, `components/ClinicMonthlyNotes.tsx:77`, `components/AlbaranNuevoClient.tsx:161`.

Les classes defineixen controls inferiors a l'objectiu de comoditat de 44 px, una taula de mínim 680 px amb estat a la dreta i una fila d'accions sense wrap intern. Cal confirmar geometria real en mòbil/tablet. 44 px és aquí un objectiu d'usabilitat, no una afirmació automàtica d'incompliment WCAG AA.

Ampliar superfície interactiva, adaptar la fila d'accions i acostar l'estat a la identificació del treball en pantalles estretes.

Categoria: responsive. Acció: `/adapt`.

### 10. P2 — Llibreries d'exportació carregades abans d'usar-les

`components/ClinicMonthlyNotes.tsx:4`, `components/CatalogoClient.tsx:4`, `components/ClientsToolbar.tsx:6`.

XLSX es carrega amb els components; diversos components també importen generadors PDF estàticament. És una oportunitat d'ajornar codi d'exportació, no una lentitud mesurada.

Mesurar bundle i temps d'interacció; fer imports dinàmics quan l'usuari exporta si el guany ho justifica, mantenint indicador de càrrega.

Categoria: rendiment. Acció: `/optimize`.

## Patró comú proposat

| Acció | Durant | Després | Confirmació prèvia |
|---|---|---|---|
| Guardar | Guardando… i botó bloquejat | Cambios guardados | No |
| Eliminar clínica | Eliminando… | Clínica eliminada i retorn al llistat | Sí, nom i conseqüències |
| Arxivar amb historial | Archivando… | Clínica archivada i accés a restaurar | Sí, conservació de l'historial |
| Canviar estat | Guardando… a la fila | Estado actualizado | Només si una conseqüència rellevant ho requereix |
| Exportar | Generando… amb abast visible | Archivo preparado; descarga iniciada | Si l'abast parcial no és evident |
| Fallar | Finalitzar pendent | Error concret i reintentar | No |

No afirmar «descargado» només perquè s'ha iniciat una descàrrega: el navegador no prova que l'usuari hagi desat el fitxer.

## Què convé conservar i ordre de treball

Conservar els tokens navy/teal, els labels associats als inputs, el dialog natiu, el feedback accessible de nou albarà i el resum d'importació CSV. No cal un redisseny visual.

1. `/shape` i `/clarify`: resoldre el contracte d'eliminar clínica i l'abast dels documents.
2. `/harden`: feedback, errors, pendents, integritat de selectors i guardats.
3. `/adapt`: verificació desktop/tablet/mòbil i controls.
4. `/optimize`: mesurar i ajornar exportadors si convé.
5. `/polish`: coherència final de missatges i estats.

Les correccions es poden abordar juntes o per fases. Després, repetir `/audit` amb proves autenticades de les accions i validació visual. Aquesta auditoria no prova l'estat de producció.

## Correccions implementades — 8 de setembre de 2026

Aplicades les correccions de feedback i gestió de clíniques: eliminació explícita només sense dependències, arxiu/restauració amb historial, llistat d'arxivades i conservació de l'assignació actual del pacient. La funció `manage_clinic` bloqueja la fila abans de comprovar dependències i només és executable pel servei del servidor. Migració aplicada a Supabase amb versió `20260908091116`.

Els formularis comuniquen pendent, èxit i error, conserven dades si falla el guardat i validen els noms imprescindibles també al servidor. La factura PDF inclou sempre el mes complet; Excel/CSV indiquen l'abast filtrat. També s'han afegit confirmacions d'edició/importació, bloqueig d'accions repetides, rollback visual del catàleg, càrrega diferida dels exportadors i millores de navegació/controls en mòbil.

Validació: build de producció, TypeScript i ESLint correctes; 16 comprovacions de navegador amb backend de prova aïllat i captures a 1280 i 390 px. Prova separada de la funció real de Supabase amb rollback de totes les dades de prova. No és una acceptació autenticada del desplegament web de producció.

La protecció de canvis sense guardar cobreix enllaços de l'aplicació i tancament/recàrrega. La navegació nativa enrere/endavant dins del document no s'intercepta. La millora de càrrega dels exportadors està implementada, però no s'atribueix cap guany de rendiment numèric sense una mesura de camp.
