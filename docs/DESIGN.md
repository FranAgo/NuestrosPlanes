---
name: Nuestros Planes
descripcion: Sistema de diseño de Nuestros Planes (index.html), extraído del código el 2026-09-27.
colors:                     # variables de :root, index.html:14
  bg: '#0E0C0A'             # fondo de la app y de los inputs
  bg-card: '#161310'        # tarjetas, modales, filas de categoría
  bg-header: '#100E0B'      # header y barra de pestañas
  border: '#2A2520'
  border-soft: '#2E2820'    # modal, login-card, inputs
  copper: '#B8783A'         # acento único: activo, primario, foco, cursor
  copper-light: '#D4A060'
  copper-dim: 'rgba(184,120,58,0.45)'
  text-main: '#EDE0CC'
  text-soft: '#A09488'
  text-muted: '#6A6058'
  text-faint: '#524840'     # placeholders
  green-ok: '#6AAA80'       # completado
  green-ok-bg: '#0A1E10'
  red-venc: '#AA6060'       # vencido, error, eliminar
  red-venc-bg: '#1E0A0A'
  white: '#FDFAF7'          # definida, sin uso hoy
typography:
  titulos: "'DM Serif Display', serif — siempre en itálica"
  ui: "'Jost', sans-serif — pesos 300, 400, 500"
  base: 16px
rounded:                    # variables de :root
  sm: 6px                   # botones, inputs, chips, badges
  md: 10px                  # tarjetas de plan, filas, card de fotos, carrusel
  lg: 16px                  # perfil-card, botón de Google
  xl: 20px                  # modal, login-card
  full: 9999px              # user-chip; avatares con 50%
spacing:
  contenido-max: 900px
  modal-max: 440px          # 400px foto de perfil, 560px carrusel
  corte-mobile: 600px       # único @media (max-width: 600px)
---

# DESIGN.md — Nuestros Planes

Qué hay hoy en `index.html`, para que un elemento nuevo se vea igual que
lo que tiene al lado sin tener que buscarlo en 3.900 líneas. En el
encabezado, los valores exactos; abajo, cuándo se usa cada cosa.

## Cómo usarlo

- **Este archivo describe el código; no lo reemplaza.** Si algo de acá no
  coincide con el código, el error es de este archivo y se corrige en el
  mismo cambio.
- **Elemento nuevo en una pantalla existente:** si sus vecinos hacen algo
  distinto de lo que dice acá, se siguen los vecinos y se menciona la
  diferencia.
- **Pantalla o modal nuevo entero:** sigue este archivo.
- **Variables, no literales.** Los colores y radios están en `:root`
  (`index.html:14`). Lo nuevo usa `var(--copper)`, `var(--radius-md)`,
  etc. No se inventan tonos cercanos. Los literales que ya existen
  (`#1A1612` en foco de input y en `option`, `#1E1A14` de fondo de avatar,
  `rgba(184,120,58,0.3)` de borde en hover) se reusan tal cual si hace
  falta ese mismo efecto.
- **Clases, no inline.** Casi todo el estilo vive en el único `<style>` del
  `<head>`. Hay unos 17 `style="..."` en el HTML/JS, casi todos
  `display:none` o un ajuste chico. Un elemento nuevo usa las clases de
  abajo; si necesita estilo propio, se agrega una clase a la hoja.

## Tema

Oscuro y cálido: marrón casi negro, texto crema y **un solo acento
cobre**. Tono íntimo y editorial, no de herramienta de trabajo. Los
títulos van en serif itálica y los controles en sans liviana, en
mayúsculas chicas y espaciadas. Los bordes son líneas finas (`0.5px`).
No hay modo claro.

El color significa algo: cobre = acción o estado activo, verde =
completado, rojo = vencido, error o eliminar. Los colores de categoría
(abajo) son la única paleta variada, y la elige el usuario.

## Color

### Superficies y texto

Del fondo hacia arriba: `--bg` → `--bg-header` (header y pestañas) →
`--bg-card` (tarjetas y modales). Cada superficie lleva borde de `0.5px`
(`--border` o `--border-soft`); no se separan capas con sombra.

Texto: `--text-main` para contenido y títulos, `--text-soft` para datos de
apoyo (meta de la tarjeta, "Por …", mensajes), `--text-muted` para labels,
pestañas inactivas y estados vacíos, `--text-faint` solo para
placeholders.

### Cobre

- `--copper`: pestaña y filtro activos, botón primario, iconos de marca
  (corazón), spinner, cursor.
- `--copper-dim`: borde del botón primario, borde de input con foco, borde
  del avatar.
- `--copper-light`: solo el texto de estado del login.
- Hover de tarjetas y filas: borde `rgba(184,120,58,0.3)`.

### Estados

| Estado | Texto | Fondo | Borde | Dónde |
|---|---|---|---|---|
| Completado | `--green-ok` | `--green-ok-bg` (hover) | `rgba(106,170,128,0.4)` | `.btn-completar`, `.completado-label`, foto subida OK |
| Vencido / error / eliminar | `--red-venc` | `--red-venc-bg` | `rgba(170,96,96,0.4)` | `.vencido-badge`, `.plan-card.vencido`, `.error-msg`, `.btn-danger`, foto con error |

No hay ámbar ni azul. Un estado nuevo que no sea ninguno de estos se
pregunta antes de inventar un color.

### Colores de categoría

`PRESET_COLORS` (`index.html:1979`): 12 pasteles que elige el usuario al
crear una categoría. El badge usa el color como texto y el mismo color con
alfa `22` como fondo (`background:${color}22;color:${color}`), siempre
pasado por `safeColor()`. No se usan para nada que no sea una categoría.

## Tipografía

Se cargan de Google Fonts en `index.html:9`: DM Serif Display (normal e
itálica) y Jost 300/400/500.

| Uso | Familia | Tamaño | Peso / estilo | Color |
|---|---|---|---|---|
| Título del login | DM Serif | 2rem | itálica | `--text-main` |
| Título de sección (`.section-header h2`) | DM Serif | 1.6rem | itálica | `--text-main` |
| Subtítulo de sección | DM Serif | 0.78rem | itálica | `--text-muted` |
| Logo del header | DM Serif | 1.2rem | itálica | `--text-main` |
| Título de modal (`.modal-header h3`) | DM Serif | 1.2rem | itálica | `--text-main` |
| Título de tarjeta (`.plan-titulo`) | DM Serif | 1.08rem | itálica | `--text-main` |
| Estado vacío (`.empty-state p`) | DM Serif | 1.05rem | itálica | `--text-muted` |
| Input | Jost | 0.95rem | 300 | `--text-main` |
| Texto de apoyo (`.plan-meta-item`) | Jost | 0.82rem | 400 | `--text-soft` |
| Botón (`.btn`) | Jost | 0.78rem (0.7rem `.btn-sm`) | 400, mayúsculas, `letter-spacing:.12em` | el de la variante |
| Pestaña, filtro, label | Jost | 0.7–0.74rem | 400, mayúsculas, `letter-spacing:.1–.14em` | `--text-muted` |
| Badge | Jost | 0.65–0.72rem | 400, mayúsculas, `letter-spacing:.08em` | el del estado o la categoría |

Regla: todo lo que es título o "voz" de la app va en DM Serif itálica, y
todo lo que es control va en Jost. Las negritas casi no se usan (el peso
máximo es 500).

## Forma, espaciado y movimiento

- **Radios:** cuanto más grande el contenedor, más radio: control 6px →
  tarjeta 10px → panel 16px → modal 20px. Los círculos (avatares,
  miniaturas, puntos de color) van con `50%`.
- **Bordes:** `0.5px` en casi todo. `1px` y `1.5px` solo en casos puntuales
  (avatar grande, borde de miniatura superpuesta, pestaña activa).
- **Espacio:** `gap` de 0.5rem entre controles, 0.7–1rem entre tarjetas o
  filas, 1.5rem entre bloques (`margin-bottom` de `.section-header` y de la
  barra de filtros). Padding: 1.2rem en tarjetas y 2rem en modal y
  contenido (1rem en mobile).
- **Contenedor:** `.app-content`, `max-width:900px` centrado. La grilla de
  planes es `repeat(auto-fill, minmax(280px, 1fr))` y pasa a una columna
  en mobile.
- **Sombras:** ninguna. La elevación se marca con borde cobre y
  `translateY(-2px)` en hover.
- **Transiciones:** `var(--transition)` (0.22s con curva estándar) en
  controles y tarjetas; 200ms en la imagen del carrusel. Entradas con
  `slideUp` (0.3s) y `fadeIn` (0.4–0.6s).
- **Decoración de marca:** una línea de 1px con degradé cobre en el borde
  superior de `.modal` y `.login-card` (`::before`), el corazón que late
  (`heartbeat`), las chispas al hacer click y el brillo de las tarjetas en
  hover. Una pantalla nueva no inventa decoraciones nuevas: si quiere una,
  usa la línea cobre del modal.

## Componentes

**Botón primario:** `class="btn btn-primary"`. Borde cobre y fondo
transparente; en hover se llena de cobre. Ojo: `.btn-primary` tiene
`width:100%`, pensado para modales y login. En la cabecera de una sección
va con `btn-sm`. Uno por vista.

**Botón secundario / cancelar:** `class="btn btn-secondary"`.

**Botón destructivo:** `class="btn btn-danger"` (rojo, más chico). Hoy lo
usa solo "Eliminar" en la fila de categoría. La confirmación de borrado
(`#modal-confirm`) usa `btn-primary` con el texto "Eliminar". Un borrado
nuevo pasa por `#modal-confirm`.

**Botón de solo icono:** `class="btn-icon"` con SVG de 15px y
`aria-label` (los de los modales lo tienen; los de la tarjeta de plan
tienen solo `title`, ver "Deudas conocidas").

**Botón de completar:** `.btn-completar` (verde) en la tarjeta de un plan
pendiente. Cuando está completado se reemplaza por `.completado-label`
con un check.

**Guardar que espera respuesta:** el botón pasa a
`innerHTML = '<span class="spinner"></span>'` y `disabled = true` hasta que
vuelve el servidor (ver `savePlan`, `index.html:3258`). Lo nuevo copia ese
patrón.

**Pestañas y filtros:** `.nav-tab` (subrayado cobre cuando está activa) y
`.filter-chip` (borde y texto cobre cuando está activo). Ambos son
`<button type="button">`.

**Tarjeta de plan:** `.plan-card` dentro de `.plans-grid`, en este orden:
header (categoría y vencido), `.plan-titulo`, `.plan-meta` (fechas con
iconos de 11px), `.plan-creator` (avatar de 20px + "Por …") y
`.plan-card-actions`. Variantes `.completado` (opacidad .55 y título
tachado) y `.vencido` (borde y fondo rojizos).

**Badge:** `.categoria-badge` (con un punto `::before` del color) y
`.vencido-badge`. Radio 6px, no pastilla. Son solo estado, nunca una
acción.

**Fila de lista:** `.categoria-row` (punto de color, nombre y acciones a
la derecha).

**Formulario:** `.form-group` con `<label>` arriba (mayúsculas, muted) y
el campo a todo el ancho. En foco, el borde pasa a cobre tenue y el fondo
a `#1A1612`. Los `<select>` llevan la flecha SVG propia y `option` con
fondo oscuro explícito. Los obligatorios se marcan con " *" en el label y
los opcionales con "(opcional)".

**Error de formulario:** `.error-msg` debajo de las acciones, visible con
`.visible`. El texto dice qué corregir ("El título y la fecha programada
son obligatorios.").

**Modal:** `.modal-overlay` (fondo `rgba(8,7,6,0.75)` + `blur(4px)`,
visible con `.visible`) > `.modal` > `.modal-header` (h3 + `btn-icon` de
cerrar con la X SVG) > contenido > `.modal-actions` (a la derecha:
`btn-secondary` Cancelar y después `btn-primary`). Un modal alto scrollea
dentro (`max-height:100%; overflow-y:auto`). Mostrar y ocultar: ver
`convenciones-tecnicas`, tema pantallas y visibilidad.

**Estado vacío:** `.empty-state` con una frase en DM Serif itálica ("No
hay planes aquí todavía.") y un adorno arriba (`.empty-icon`, hoy un glifo,
ver "Iconos").

**Carga:** `.spinner` (14px, cobre) en botones y miniaturas; skeletons
con el brillo `skeletonShimmer` (`.skeleton-card`, card de fotos con
`.is-loading`) mientras carga la app. El error de carga (`#app-loading`,
BUG-CARGA-001) muestra el motivo y un botón Reintentar.

**Avatar:** `.avatar` (30px, 72px con `.avatar-lg`), círculo con borde
cobre tenue; sin foto, muestra la inicial en cobre.

## Iconos

- **SVG de línea, siempre.** Lo nuevo usa el formato más reciente del
  archivo: `viewBox="0 0 24 24"`, `fill="none"`,
  `stroke="currentColor"`, `stroke-width` 1.8 (cerrar, cámara) o 2
  (más, flechas, check), `stroke-linecap="round"`,
  `aria-hidden="true"`. El tamaño lo pone el CSS del contenedor (15px en
  `.btn-icon`, 0.95em dentro de `.btn`).
- Los iconos de la tarjeta de plan (editar, borrar, calendario, reloj,
  lápiz) son de una generación anterior: `viewBox` de 14 u 11, trazo de
  0.9–1 y tamaño fijo en el atributo. No se copian para un icono nuevo.
- No hay un set central: cada SVG está pegado donde se usa. Si un icono
  nuevo se repite en varios lugares, se define una vez como constante.
- **Glifos que quedan (BL-004):** `✦` (vacío de planes,
  `index.html:2953`), `◇` (vacío de categorías, `index.html:3353`) y `✕`
  (overlay de foto con error, `index.html:3086`). No se suman glifos
  nuevos. La flecha `→` de "Ver recuerdos →" es texto, no un icono.
- El `♡` del `<title>` es parte del nombre de la marca: no aplica.

## Excepciones

- **Cursor propio:** con mouse real (`(hover: hover) and (pointer:
  fine)`), la app oculta el cursor (`cursor:none` en `body` y en cada
  clickeable) y dibuja un punto y un halo cobre que crece sobre lo
  clickeable (`CLICKABLE_SEL`, `index.html:2007`). Es identidad de la app
  y reemplaza la regla "cursor pointer" de `hjay-identidad-visual`. Un
  elemento clickeable nuevo: `cursor:none` en su clase y, si no es
  `button`, `a` ni `input`, sumarlo a `CLICKABLE_SEL` para que el halo
  reaccione. La única excepción hoy es `.retry-btn` de `#app-loading`, con
  `cursor:pointer` (sin motivo documentado).
- **Login:** tiene su propio fondo (degradés cobre radiales y canvas de
  estrellas) y el botón de Google con barrido de luz. No se copia al
  resto de la app.
- **Mobile (≤600px):** el único corte. Achica paddings, pestañas más
  chicas, grilla de planes en una columna y carrusel cuadrado. Los ajustes
  de mobile de un componente nuevo van dentro de ese mismo bloque
  (`index.html:1624`).

## Deudas conocidas

Cosas que el código hace distinto del criterio de `hjay-identidad-visual`.
Lo nuevo no las copia. Arreglar lo existente es aparte (backlog), no se
hace de paso.

- `--transition` es `all 0.22s …`: se anima cualquier propiedad. Una
  transición nueva nombra sus propiedades.
- No hay bloque `prefers-reduced-motion`: latido, chispas, brillo y
  skeletons siempre se mueven. Una animación nueva conviene que ya venga
  apagable.
- Falta `color-scheme: dark`: el calendario nativo de los
  `<input type="date">` puede salir claro.
- Los `<label>` no tienen `for`, y los botones de la tarjeta (editar,
  eliminar) no tienen `aria-label` ni `type="button"`. Un campo o botón
  nuevo sí los lleva.
- `.form-group input` saca el `outline` y marca el foco solo con el borde
  cobre tenue, sin `:focus-visible` propio.

## No hacer

- Un segundo acento (azul, violeta, ámbar) o un tono "parecido" al cobre.
- Sombras, degradés nuevos o blanco puro en texto.
- Negrita (más de 500) o títulos en Jost.
- Pastillas redondas para acciones; los badges son solo estado.
- Colores de categoría fuera de un badge o punto de categoría.
- Glifos o emojis como iconos.

## Mantenimiento

Lo mantiene Jay. Se actualiza en el mismo cambio que agrega o cambia algo
de este archivo (una variable de `:root`, un componente con clase propia,
un corte de pantalla, un icono repetido que pasa a constante, una deuda
que se salda). Para revisar que siga vigente: comparar `:root`, los
`@media` y las clases de la hoja de estilos contra este archivo, y contar
glifos con `grep -n "✦\|◇\|✕" index.html`.
