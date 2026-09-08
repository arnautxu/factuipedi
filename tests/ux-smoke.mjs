// Builds and runs against an isolated PostgREST fixture; never calls production.
// PLAYWRIGHT_MODULE may point to a shared Playwright installation.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = 4317, apiPort = 4318;
const clinicId = randomUUID(), patientId = randomUUID();
const db = {
  clinics: [{ id: clinicId, name: 'Clínica de prueba con historial', active: true, address: 'Calle de prueba 12', behandelaar: '', notes: '' }],
  clients: [{ id: patientId, naam_patient: 'Paciente de prueba', clinic_id: clinicId }],
  delivery_notes: ['pending', 'reviewed'].map((monthly_status, i) => ({ id: randomUUID(), clinic_id: clinicId, client_id: patientId, source: 'created', monthly_status, pakbonnummer: `QA-${i + 1}`, naam_patient: `Paciente ficticio ${i + 1}`, uitgiftedatum: '08-09-2026', total: (i + 1) * 100 })),
  catalog_items: [1, 2].map(i => ({ id: randomUUID(), cat: 'Pruebas', code: `T${i}`, description: `Producto de prueba ${i}`, price: 10, price_text: null, active: true, position: i })),
  uploaded_documents: [], imported_works: [], delivery_note_lines: [],
};
let failNext = false;
let clinicWrites = 0;
const api = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${apiPort}`);
  const parts = url.pathname.split('/'); const table = parts.at(-1);
  let body = ''; for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  res.setHeader('Content-Type', 'application/json');
  const send = (value, status = 200) => { res.statusCode = status; res.end(JSON.stringify(value)); };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    await new Promise(resolve => setTimeout(resolve, 180));
    if (failNext) { failNext = false; return send({ code: 'QA_ERROR', message: 'Simulated failure' }, 500); }
  }
  if (parts.includes('rpc')) {
    if (table !== 'manage_clinic') return send({ message: 'Unexpected RPC' }, 400);
    const row = db.clinics.find(c => c.id === input.target_id);
    if (!row) return send('not_found');
    if (input.operation === 'delete') {
      if (['clients', 'delivery_notes', 'imported_works'].some(t => db[t].some(r => r.clinic_id === row.id))) return send('has_history');
      db.clinics = db.clinics.filter(c => c.id !== row.id);
    } else row.active = input.operation === 'restore';
    return send('ok');
  }
  if (!(table in db)) return send({ message: `Unexpected table ${table}` }, 400);
  const matches = row => [...url.searchParams].every(([key, expr]) => {
    if (['select', 'order', 'limit', 'offset', 'or'].includes(key)) return true;
    if (expr.startsWith('eq.')) return String(row[key]) === expr.slice(3);
    if (expr.startsWith('neq.')) return String(row[key]) !== expr.slice(4);
    if (expr.startsWith('in.(')) return expr.slice(4, -1).split(',').includes(String(row[key]));
    return true;
  });
  let rows = db[table].filter(matches);
  if (req.method === 'POST') {
    const entries = Array.isArray(input) ? input : [input];
    if (table === 'clinics' && entries.some(entry => db.clinics.some(c => c.name === entry.name))) return send({ code: '23505' }, 409);
    rows = entries.map(entry => ({ id: randomUUID(), ...entry })); db[table].push(...rows);
    if (table === 'clinics') clinicWrites++;
  } else if (req.method === 'PATCH') {
    rows.forEach(row => Object.assign(row, input));
    if (table === 'clinics') clinicWrites++;
  } else if (req.method === 'DELETE') db[table] = db[table].filter(row => !matches(row));
  res.setHeader('content-range', `0-${Math.max(rows.length - 1, 0)}/${rows.length}`);
  if (req.method === 'HEAD') return res.end();
  send(req.headers.accept?.includes('vnd.pgrst.object+json') ? rows[0] ?? null : rows);
});
await new Promise(resolve => api.listen(apiPort, '127.0.0.1', resolve));
const secret = randomUUID();
const testEnv = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${apiPort}`, SUPABASE_SERVICE_ROLE_KEY: 'isolated-test-key', SESSION_SECRET: secret };
const build = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env: testEnv, stdio: 'pipe' });
let buildOutput = ''; build.stdout.on('data', c => buildOutput += c); build.stderr.on('data', c => buildOutput += c);
const buildCode = await new Promise(resolve => build.on('exit', resolve));
if (buildCode !== 0) { api.close(); throw new Error(buildOutput); }
console.log('PASS Production build with isolated test configuration');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  env: testEnv, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = ''; server.stdout.on('data', c => serverOutput += c); server.stderr.on('data', c => serverOutput += c);
let browser, testPage;
try {
  for (let i = 0; i < 100; i++) {
    try { await fetch(`http://localhost:${port}/login`); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const token = await new SignJWT({ sub: 'isolated-ux-test' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('10m').sign(new TextEncoder().encode(secret));
  await context.addCookies([{ name: 'noadentlab_session', value: token, domain: 'localhost', path: '/' }]);
  const page = await context.newPage(); testPage = page; page.setDefaultTimeout(10000);
  const checks = [];
  const check = (name) => { checks.push(name); console.log(`PASS ${name}`); };
  const waitText = async text => page.getByText(text, { exact: true }).waitFor();
  await page.goto(`http://localhost:${port}/clinicas/nueva`);
  assert.equal(await page.getByRole('checkbox').count(), 0);
  await page.getByRole('button', { name: 'Crear clínica', exact: true }).click();
  assert.equal(clinicWrites, 0); check('Blank clinic rejected before mutation');
  await page.getByLabel('Nombre de la clínica').fill('Clínica temporal UX');
  await page.getByRole('button', { name: 'Crear clínica', exact: true }).dblclick();
  await waitText('Clínica creada.'); assert.equal(clinicWrites, 1); check('Create confirmation survives redirect; no duplicate submission');
  const newId = db.clinics.find(c => c.name === 'Clínica temporal UX').id;
  await page.getByLabel('Notas', { exact: true }).fill('Notas nuevas');
  failNext = true;
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await waitText('No se han podido guardar los cambios. Vuelve a intentarlo.');
  assert.equal(await page.getByLabel('Notas', { exact: true }).inputValue(), 'Notas nuevas'); check('Failed save preserves form values');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await waitText('Cambios de la clínica guardados.'); check('Retry saves and confirms');
  await page.getByRole('button', { name: 'Eliminar clínica', exact: true }).click();
  const dialog = page.getByRole('dialog');
  assert.equal(await dialog.getByRole('button', { name: 'Cancelar', exact: true }).evaluate(e => e === document.activeElement), true);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert(db.clinics.some(c => c.id === newId)); check('Destructive confirmation defaults to cancel');
  await page.getByRole('button', { name: 'Eliminar clínica', exact: true }).click();
  await dialog.getByRole('button', { name: 'Eliminar clínica', exact: true }).click();
  await waitText('Clínica eliminada.'); assert(!db.clinics.some(c => c.id === newId)); check('Delete empty clinic and show list confirmation');
  await page.goto(`http://localhost:${port}/clinicas/${clinicId}`);
  assert.equal(await page.getByRole('button', { name: 'Eliminar clínica', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Archivar clínica', exact: true }).click();
  await dialog.getByRole('button', { name: 'Archivar clínica', exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar clínica', exact: true }).waitFor();
  assert.equal(db.clinics[0].active, false); check('Clinic with history archives instead of deleting');
  await page.goto(`http://localhost:${port}/clinicas?estado=archivadas`);
  await page.getByRole('link', { name: /Clínica de prueba con historial/ }).waitFor(); check('Archived clinics remain discoverable');
  await page.goto(`http://localhost:${port}/clientes/${patientId}`);
  assert.equal(await page.getByLabel('Clínica', { exact: true }).inputValue(), clinicId);
  await page.getByLabel('Notas', { exact: true }).fill('Actualización sin reasignar');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await waitText('Cambios del paciente guardados.');
  assert.equal(db.clients[0].clinic_id, clinicId); check('Saving patient preserves archived clinic assignment');
  await page.goto(`http://localhost:${port}/clinicas/${clinicId}`);
  await page.getByRole('button', { name: 'Restaurar clínica', exact: true }).click();
  await dialog.getByRole('button', { name: 'Restaurar clínica', exact: true }).click();
  await page.getByRole('button', { name: 'Archivar clínica', exact: true }).waitFor(); assert.equal(db.clinics[0].active, true); check('Restore clinic');
  await page.getByLabel('Mostrar trabajos').selectOption('pending');
  await waitText('Mostrando 1 de 2 trabajos · Pendiente · 100,00 €');
  const exportEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel (1 trabajos visibles)', exact: true }).click();
  const download = await exportEvent;
  const XLSX = await import('xlsx'); const workbook = XLSX.read(await readFile(await download.path()));
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  assert.equal(rows.length, 1); assert.equal(rows[0].Alcance, 'Filtrado: Pendiente'); check('Filtered spreadsheet contains only visible works and explicit scope');
  const pdfEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar factura del mes completo', exact: true }).click();
  const pdf = await pdfEvent; const bytes = await readFile(await pdf.path()); assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  await waitText('Factura del mes completo preparada (2 trabajos). Descarga iniciada.'); check('Monthly PDF includes complete month despite status filter');
  await page.getByLabel('Estado de QA-1', { exact: true }).selectOption('reviewed');
  await waitText('Albarán QA-1: Revisado. Ya no aparece porque no coincide con el filtro.'); check('Status change confirms why filtered row disappears');
  await mkdir('artifacts/ux-audit', { recursive: true });
  await page.getByLabel('Mostrar trabajos').selectOption('all');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/ux-audit/clinic-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/ux-audit/clinic-mobile.png', fullPage: true }); check('Clinic page fits mobile viewport');
  await page.goto(`http://localhost:${port}/catalogo`);
  const original = db.catalog_items.map(c => c.id);
  failNext = true;
  await page.getByRole('button', { name: 'Mover T1 abajo', exact: true }).click();
  await page.getByText(/^Error al reordenar:/).waitFor();
  assert.deepEqual(await page.locator('tbody tr').evaluateAll(rows => rows.map(r => r.children[2]?.textContent).filter(Boolean)), ['T1', 'T2']);
  assert.deepEqual(db.catalog_items.map(c => c.id), original); check('Failed catalog reorder rolls back visible order');
  await page.goto(`http://localhost:${port}/clinicas/${clinicId}`);
  await page.getByLabel('Notas', { exact: true }).fill('Sin guardar');
  const prompt = page.waitForEvent('dialog');
  const click = page.getByRole('link', { name: '← Volver a clínicas', exact: true }).click();
  const leave = await prompt; assert.equal(leave.type(), 'confirm'); await leave.dismiss(); await click;
  assert(page.url().endsWith(clinicId)); check('Unsaved changes protect in-app link navigation');
  console.log(`${checks.length} UX checks passed; all data isolated.`);
} catch (error) { console.error(serverOutput.slice(-2000)); console.error(await testPage?.locator("body").innerText()); console.error("Fixture writes", clinicWrites); throw error; }
finally { await browser?.close(); server.kill(); await new Promise(resolve => api.close(resolve)); }
