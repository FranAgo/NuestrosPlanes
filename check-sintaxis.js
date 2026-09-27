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
 * Uso, parado en la raíz del repo:
 *   node check-sintaxis.js
 *
 * Adaptado de check-sintaxis.js del proyecto sis-web (DEC-001).
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = __dirname;

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

  console.log('');
  if (huboError) {
    console.error('Hay errores de sintaxis. NO deployar hasta corregirlos.');
    process.exit(1);
  }
  console.log('Todo OK.');
}

main();
