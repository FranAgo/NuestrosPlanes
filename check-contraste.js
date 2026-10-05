'use strict';

/**
 * Medición de contraste de la paleta de Nuestros Planes (REQ-UX-002,
 * criterio 3).
 *
 * Lee el primer bloque `:root { ... }` de un archivo (por defecto
 * index.html), toma las variables de color (`#rgb`, `#rrggbb`, `rgba()`) y
 * calcula el contraste WCAG 2 de cada par que la app usa de verdad (texto
 * sobre su fondo, borde sobre la superficie donde se dibuja). Un color con
 * transparencia se mezcla primero sobre la superficie donde va.
 *
 * Mínimos: 4,5:1 para texto (WCAG AA), 3:1 para bordes de campos y botones
 * (WCAG 1.4.11). Los bordes de tarjetas no tienen mínimo formal: se informan
 * como referencia (ver REQ-UX-002, criterio 2).
 *
 * Si falta una variable que la paleta nueva agrega (ej. --bg-elevated), usa
 * la que la reemplazaba antes, así el script también mide la paleta vieja.
 *
 * Uso, parado en la raíz del repo:
 *   node check-contraste.js               (mide index.html)
 *   node check-contraste.js otro.css      (mide el :root de otro archivo)
 * Sale con código 1 si algún par obligatorio no llega al mínimo.
 */

const fs = require('node:fs');
const path = require('node:path');

// Variable nueva -> la que ocupaba su lugar en la paleta anterior.
const REEMPLAZOS = {
  '--bg-elevated': '--bg-card',
  '--bg-input': '--bg',
  '--bg-card-vencido': '#1A1010',
  '--border-control': '--border-soft',
  '--bg-card-done': '--bg-card',
  '--green-line': 'rgba(106,170,128,0.4)',
  '--red-line': 'rgba(170,96,96,0.4)',
};

// [texto o borde, fondo, mínimo, descripción]. Mínimo null = solo referencia.
const PARES = [
  ['--text-main', '--bg', 4.5, 'texto principal sobre fondo'],
  ['--text-main', '--bg-card', 4.5, 'texto principal sobre tarjeta'],
  ['--text-main', '--bg-elevated', 4.5, 'texto principal sobre modal'],
  ['--text-soft', '--bg-card', 4.5, 'texto de apoyo sobre tarjeta'],
  ['--text-soft', '--bg-elevated', 4.5, 'texto de apoyo sobre modal'],
  ['--text-muted', '--bg', 4.5, 'labels, pestañas inactivas sobre fondo'],
  ['--text-muted', '--bg-header', 4.5, 'pestaña inactiva sobre header'],
  ['--text-muted', '--bg-card', 4.5, 'texto apagado sobre tarjeta (y tarjeta completada)'],
  ['--text-muted', '--bg-elevated', 4.5, 'label de formulario sobre modal'],
  ['--text-faint', '--bg-input', 4.5, 'placeholder dentro del campo'],
  ['--copper', '--bg', 4.5, 'cobre (pestaña, filtro activo) sobre fondo'],
  ['--copper', '--bg-card', 4.5, 'cobre sobre tarjeta'],
  ['--copper', '--bg-elevated', 4.5, 'cobre sobre modal'],
  ['--bg', '--copper', 4.5, 'texto oscuro sobre botón cobre lleno'],
  ['--on-copper', '--copper', 4.5, 'texto sobre cobre metálico (primario, Google, "De acuerdo")'],
  ['--on-copper', '#B57A3E', 4.5, 'texto sobre el degradé metálico al 80 % del alto (pie del renglón)'],
  ['--copper-light', '--bg-card', 4.5, 'cobre claro (estado del login)'],
  ['--text-soft', '--bg-card-done', 4.5, 'título de tarjeta completada'],
  ['--text-muted', '--bg-card-done', 4.5, 'texto apagado en tarjeta completada'],
  ['--green-ok', '--bg-card-done', 4.5, 'verde sobre tarjeta completada'],
  ['--green-ok', '--bg-card', 4.5, 'verde completado sobre tarjeta'],
  ['--green-ok', '--green-ok-bg', 4.5, 'verde sobre su fondo'],
  ['--red-venc', '--bg-card', 4.5, 'rojo sobre tarjeta'],
  ['--red-venc', '--bg-card-vencido', 4.5, 'rojo sobre tarjeta vencida'],
  ['--red-venc', '--red-venc-bg', 4.5, 'rojo sobre su fondo (badge, error)'],
  ['--red-venc', '--bg-elevated', 4.5, 'error de campo sobre modal (REQ-PLAN-002)'],
  ['--green-ok', '--bg-elevated', 4.5, 'confirmación de campo sobre modal (REQ-PLAN-002)'],
  ['--amber', '--bg-card', 4.5, 'idea anotada hace más de 3 meses (REQ-PLAN-003)'],
  ['--border-control', '--bg-elevated', 3, 'borde de campo sobre modal'],
  ['--red-line', '--bg-input', 3, 'borde de campo con error (REQ-PLAN-002)'],
  ['--border-control', '--bg-card', 3, 'borde de botón secundario sobre tarjeta'],
  ['--green-line', '--bg-card', 3, 'borde de "Completar" sobre tarjeta'],
  ['--red-line', '--bg-card', 3, 'borde de botón "Eliminar" sobre tarjeta'],
  ['--copper-dim', '--bg-card', 3, 'borde cobre (botón, foco) sobre tarjeta'],
  ['--copper-dim', '--bg-elevated', 3, 'borde cobre sobre modal'],
  ['--border', '--bg', null, 'borde de tarjeta sobre fondo (referencia)'],
];

function leerTokens(archivo) {
  const texto = fs.readFileSync(archivo, 'utf8');
  const m = texto.match(/:root\s*\{([\s\S]*?)\}/);
  if (!m) throw new Error('No hay bloque :root en ' + archivo);
  const tokens = {};
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let t;
  while ((t = re.exec(m[1])) !== null) {
    const color = parsearColor(t[2].trim());
    if (color) tokens[t[1]] = color;
  }
  return tokens;
}

function parsearColor(v) {
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  return null;
}

function resolver(tokens, nombre) {
  if (nombre.startsWith('#')) return parsearColor(nombre);   // literal: un punto de un degradé
  if (tokens[nombre]) return tokens[nombre];
  const alt = REEMPLAZOS[nombre];
  if (!alt) return null;
  return alt.startsWith('--') ? resolver(tokens, alt) : parsearColor(alt);
}

// Mezcla un color con transparencia sobre un fondo opaco.
function mezclar(fg, bg) {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

function luminancia(c) {
  const lin = x => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function contraste(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function main() {
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, 'index.html'));
  const tokens = leerTokens(archivo);
  let fallas = 0;
  console.log('Contraste de ' + path.relative(process.cwd(), archivo) + '\n');
  for (const [fgN, bgN, min, desc] of PARES) {
    const fg = resolver(tokens, fgN), bg = resolver(tokens, bgN);
    if (!fg || !bg) {
      console.log('  FALTA  ' + (fg ? bgN : fgN) + ' (' + desc + ')');
      fallas++;
      continue;
    }
    const r = contraste(mezclar(fg, bg), bg);
    const estado = min === null ? ' ref ' : (r >= min ? ' ok  ' : 'FALLA');
    if (min !== null && r < min) fallas++;
    const minTxt = min === null ? '    ' : ('≥' + min).padEnd(4);
    console.log('  ' + estado + '  ' + r.toFixed(2).padStart(5) + ':1 ' + minTxt + '  ' + fgN + ' / ' + bgN + ' — ' + desc);
  }
  console.log(fallas ? '\n' + fallas + ' par(es) por debajo del mínimo.' : '\nTodos los pares obligatorios pasan.');
  process.exit(fallas ? 1 : 0);
}

main();
