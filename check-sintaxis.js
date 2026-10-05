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
 * no se contradigan (DEC-016): ver chequearEstados().
 *
 * Uso, parado en la raíz del repo:
 *   node check-sintaxis.js
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
const ESTADOS_REQ = ['PROPUESTO', 'EN DESARROLLO', 'HECHO', 'CERRADO', 'DESCARTADO'];
const LINEA_ESTADO_REQ = /^> \*\*Estado:\*\* (PROPUESTO|EN DESARROLLO|HECHO|CERRADO|DESCARTADO)( \(\d{4}-\d{2}-\d{2}\))?$/;
const LINEA_VERSION_REQ = /^> \*\*Versión:\*\* (\d+\.\d+\.\d+)$/;
const LINEA_ESTADO_BL = /^- Estado: (Propuesto|Priorizado|En curso|Hecho|Descartado|Pasó a ((?:REQ|BUG)-[A-Z]+-\d+))( \((\d{4}-\d{2}-\d{2}|\d+\.\d+\.\d+)\))?$/;

function chequearEstados() {
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
  for (const archivo of fs.readdirSync(dirReq).filter(f => /^(REQ|BUG)-.+\.md$/.test(f))) {
    const id = archivo.replace(/\.md$/, '');
    const encabezado = fs.readFileSync(path.join(dirReq, archivo), 'utf8')
      .split(/\r?\n/).slice(0, 15).filter(l => l.startsWith('>'));
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

  let bl = '';
  for (const linea of fs.readFileSync(backlog, 'utf8').split(/\r?\n/)) {
    const titulo = linea.match(/^### (BL-\d+)/);
    if (titulo) bl = titulo[1];
    if (!bl || !linea.startsWith('- Estado:')) continue;
    const est = linea.match(LINEA_ESTADO_BL);
    if (!est) {
      errores.push(`${bl}: la línea de estado tiene que ser "- Estado: VALOR", con una fecha o versión entre paréntesis como mucho. El resto va a "- Resuelto:" o a la Nota.`);
    } else if (est[2] && !reqs.has(est[2])) {
      errores.push(`${bl}: apunta a ${est[2]}, que no existe en docs/requerimientos.`);
    }
  }

  if (errores.length === 0) {
    console.log(`✔ estados: ${reqs.size} REQ/BUG y backlog sin contradicciones`);
    return true;
  }
  console.error('✘ estados de REQ y backlog (DEC-016):');
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

  if (!chequearEstados()) huboError = true;

  console.log('');
  if (huboError) {
    console.error('Hay errores de sintaxis o de estados. NO deployar hasta corregirlos.');
    process.exit(1);
  }
  console.log('Todo OK.');
}

main();
