'use strict';

/**
 * Chequeo de sintaxis de index.html, Code.gs y Tests.gs.
 *
 * Por qué existe: `node --check` no funciona sobre un .html (Node no parsea
 * HTML, solo JS). Este script extrae los bloques <script> inline de
 * index.html (los que no tienen `src`, o sea ni Google Sign-In ni ninguna
 * librería externa) y, junto con los .gs, los compila con vm.Script: detecta
 * errores de sintaxis SIN ejecutar nada.
 *
 * Que pase no significa que la lógica esté bien: solo que no hay errores de
 * sintaxis. Un nombre sin declarar (ReferenceError) no lo detecta.
 *
 * También chequea que los estados de docs/requerimientos y docs/backlog.md
 * no se contradigan (DEC-016) y que el vínculo entre cada REQ y el ítem del
 * backlog del que salió coincida en las dos puntas (DEC-024): ver
 * chequearEstados().
 *
 * Uso, parado en la raíz del repo:
 *   node check-sintaxis.js
 *   node check-sintaxis.js --arreglar   (escribe en docs/backlog.md el
 *                                        "Pasó a" que dice el Origen de
 *                                        cada REQ, y después chequea)
 *
 * Adaptado de check-sintaxis.js del proyecto sis-web (DEC-001).
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const RAIZ = __dirname;

// Estados de REQ y backlog (DEC-016). El estado de cada pedido vive en un
// solo lugar, el encabezado de su REQ, y el backlog solo apunta ahí. Las
// líneas de estado tienen un formato fijo (valor y, como mucho, una fecha o
// una versión): no se busca texto prohibido, se rechaza todo lo que no sea
// ese formato. El texto libre va a "Historia:" (REQ) o "Resuelto:" (BL).
// Ver docs/investigacion/2026-10-04-estado-de-requerimientos.md.
//
// Vínculo REQ ↔ BL (DEC-024): se escribe una sola vez, en el REQ
// ("> **Origen:** BL-045"). El "Pasó a REQ-X" del backlog es la otra punta:
// tiene que coincidir, y --arreglar la escribe a partir del Origen. Ver
// docs/investigacion/2026-10-07-vinculo-backlog-req.md.
const ESTADOS_REQ = ['PROPUESTO', 'EN DESARROLLO', 'HECHO', 'CERRADO', 'DESCARTADO'];
const LINEA_ESTADO_REQ = /^> \*\*Estado:\*\* (PROPUESTO|EN DESARROLLO|HECHO|CERRADO|DESCARTADO)( \(\d{4}-\d{2}-\d{2}\))?$/;
const LINEA_VERSION_REQ = /^> \*\*Versión:\*\* (\d+\.\d+\.\d+)$/;
const LINEA_ORIGEN_REQ = /^> \*\*Origen:\*\* (BL-\d+(?:, BL-\d+)*)$/;
const LINEA_ESTADO_BL = /^- Estado: (Propuesto|Priorizado|En curso|Hecho|Descartado|Pasó a ((?:REQ|BUG)-[A-Z]+-\d+))( \((\d{4}-\d{2}-\d{2}|\d+\.\d+\.\d+)\))?$/;

function chequearEstados(arreglar) {
  const dirReq = path.join(RAIZ, 'docs', 'requerimientos');
  const backlog = path.join(RAIZ, 'docs', 'backlog.md');
  if (!fs.existsSync(dirReq) || !fs.existsSync(backlog)) return true;

  let tags = null;
  try {
    tags = new Set(execFileSync('git', ['tag', '--list'], { cwd: RAIZ, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
  } catch (_) {
    console.warn('⚠ No pude leer los tags de git: salteo el chequeo de versiones.');
  }

  const errores = [];
  const reqs = new Map();
  const origenes = new Map(); // BL -> REQ que lo nombran en su "Origen:"
  const fechaReq = new Map(); // REQ -> primera fecha de su Historia (la del "Pasó a")
  for (const archivo of fs.readdirSync(dirReq).filter(f => /^(REQ|BUG)-.+\.md$/.test(f))) {
    const id = archivo.replace(/\.md$/, '');
    const encabezado = fs.readFileSync(path.join(dirReq, archivo), 'utf8')
      .split(/\r?\n/).slice(0, 15).filter(l => l.startsWith('>'));
    const lineaOrigen = encabezado.find(l => l.startsWith('> **Origen:**'));
    const o = lineaOrigen && lineaOrigen.match(LINEA_ORIGEN_REQ);
    if (lineaOrigen && !o) {
      errores.push(`${id}: la línea de origen tiene que ser "> **Origen:** BL-NNN" o "BL-NNN, BL-MMM", sin nada más.`);
    }
    if (o) {
      for (const bl of o[1].split(', ')) origenes.set(bl, (origenes.get(bl) || []).concat(id));
    }
    const historia = encabezado.find(l => l.startsWith('> **Historia:**'));
    const fecha = historia && historia.match(/\d{4}-\d{2}-\d{2}/);
    if (fecha) fechaReq.set(id, fecha[0]);

    const lineaEstado = encabezado.find(l => l.startsWith('> **Estado:**'));
    const m = lineaEstado && lineaEstado.match(LINEA_ESTADO_REQ);
    reqs.set(id, m ? m[1] : null);
    if (!m) {
      errores.push(`${id}: la línea de estado tiene que ser "> **Estado:** VALOR" o "VALOR (AAAA-MM-DD)", con VALOR = ${ESTADOS_REQ.join(', ')}. El resto va a "> **Historia:**".`);
      continue;
    }
    const lineaVersion = encabezado.find(l => l.startsWith('> **Versión:**'));
    const v = lineaVersion && lineaVersion.match(LINEA_VERSION_REQ);
    if (lineaVersion && !v) {
      errores.push(`${id}: la línea de versión tiene que ser "> **Versión:** X.Y.Z", sin nada más.`);
    }
    if (v && tags && tags.has(`v${v[1]}`) && (m[1] === 'PROPUESTO' || m[1] === 'EN DESARROLLO')) {
      errores.push(`${id}: dice ${m[1]} pero la versión ${v[1]} ya tiene tag.`);
    }
  }

  const lineaPasoA = req => `- Estado: Pasó a ${req}${fechaReq.has(req) ? ` (${fechaReq.get(req)})` : ''}`;

  const texto = fs.readFileSync(backlog, 'utf8');
  const lineas = texto.split(/\r?\n/);
  const estadoBl = new Map(); // BL -> índice de su línea "- Estado:" (null si no tiene)
  let bl = '';
  lineas.forEach((linea, i) => {
    const titulo = linea.match(/^### (BL-\d+)/);
    if (titulo) {
      bl = titulo[1];
      estadoBl.set(bl, null);
    } else if (bl && linea.startsWith('- Estado:') && estadoBl.get(bl) === null) {
      estadoBl.set(bl, i);
    }
  });

  // --arreglar: la línea del backlog se deriva del Origen del REQ. Solo se
  // escribe sobre un BL que todavía no dice "Pasó a": si ya apunta a otro
  // REQ es un conflicto, y eso lo decide una persona.
  if (arreglar) {
    let cambios = 0;
    for (const [id, deReqs] of origenes) {
      const i = estadoBl.get(id);
      if (deReqs.length !== 1 || i == null) continue;
      const est = lineas[i].match(LINEA_ESTADO_BL);
      if (est && est[2]) continue;
      const nueva = lineaPasoA(deReqs[0]);
      console.log(`✎ ${id}: "${lineas[i]}" → "${nueva}"`);
      lineas[i] = nueva;
      cambios++;
    }
    if (cambios) fs.writeFileSync(backlog, lineas.join(texto.includes('\r\n') ? '\r\n' : '\n'), 'utf8');
    else console.log('✎ --arreglar: nada que cambiar en docs/backlog.md');
  }

  for (const [id, i] of estadoBl) {
    if (i == null) continue;
    const est = lineas[i].match(LINEA_ESTADO_BL);
    if (!est) {
      errores.push(`${id}: la línea de estado tiene que ser "- Estado: VALOR", con una fecha o versión entre paréntesis como mucho. El resto va a "- Resuelto:" o a la Nota.`);
    } else if (est[2] && !reqs.has(est[2])) {
      errores.push(`${id}: apunta a ${est[2]}, que no existe en docs/requerimientos.`);
    } else if (est[2] && !(origenes.get(id) || []).includes(est[2])) {
      errores.push(`${id}: dice "Pasó a ${est[2]}" pero ${est[2]} no lo nombra en su "> **Origen:**". Agregalo ahí.`);
    }
  }

  for (const [id, deReqs] of origenes) {
    if (!estadoBl.has(id)) {
      errores.push(`${deReqs.join(', ')}: el Origen nombra ${id}, que no existe en docs/backlog.md.`);
      continue;
    }
    if (deReqs.length > 1) {
      errores.push(`${id}: figura en el Origen de ${deReqs.join(' y ')}. Un BL pasa a un solo REQ; en el otro, nombralo en la Historia.`);
      continue;
    }
    const i = estadoBl.get(id);
    const est = i == null ? null : lineas[i].match(LINEA_ESTADO_BL);
    if (est && est[2] === deReqs[0]) continue;
    const actual = i == null ? 'no tiene línea "- Estado:"' : `dice "${lineas[i]}"`;
    const arreglo = est && est[2]
      ? 'Decidí a cuál de los dos pasó y corregí la otra punta.'
      : 'Corré: node check-sintaxis.js --arreglar';
    errores.push(`${id}: es el Origen de ${deReqs[0]} pero ${actual}. Corresponde "${lineaPasoA(deReqs[0])}". ${arreglo}`);
  }

  if (errores.length === 0) {
    console.log(`✔ estados: ${reqs.size} REQ/BUG y backlog sin contradicciones, ${origenes.size} vínculos REQ ↔ BL que coinciden`);
    return true;
  }
  console.error('✘ estados de REQ y backlog (DEC-016, DEC-024):');
  for (const e of errores) console.error(`  ${e}`);
  return false;
}

function bloquesDeHtml(archivo) {
  const html = fs.readFileSync(archivo, 'utf8');
  const regex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const bloques = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[1].trim()) bloques.push(m[1]);
  }
  return bloques;
}

function main() {
  const piezas = [];

  const html = path.join(RAIZ, 'index.html');
  const bloques = fs.existsSync(html) ? bloquesDeHtml(html) : [];
  if (bloques.length === 0) {
    console.error('No encontré bloques <script> inline en index.html. Corré este script desde la raíz del repo.');
    process.exit(1);
  }
  bloques.forEach((codigo, i) => piezas.push({ nombre: `index.html (bloque ${i + 1}/${bloques.length})`, codigo }));

  for (const gs of ['Code.gs', 'Tests.gs']) {
    const archivo = path.join(RAIZ, gs);
    if (fs.existsSync(archivo)) piezas.push({ nombre: gs, codigo: fs.readFileSync(archivo, 'utf8') });
  }

  let huboError = false;
  for (const { nombre, codigo } of piezas) {
    try {
      // new vm.Script solo compila: no ejecuta nada del código.
      new vm.Script(codigo, { filename: nombre });
      console.log(`✔ ${nombre}: sintaxis OK (${codigo.split('\n').length} líneas)`);
    } catch (err) {
      huboError = true;
      console.error(`✘ ${nombre}: ERROR DE SINTAXIS`);
      console.error(`  ${err.message}`);
    }
  }

  if (!chequearEstados(process.argv.includes('--arreglar'))) huboError = true;

  console.log('');
  if (huboError) {
    console.error('Hay errores de sintaxis o de estados. NO deployar hasta corregirlos.');
    process.exit(1);
  }
  console.log('Todo OK.');
}

main();
