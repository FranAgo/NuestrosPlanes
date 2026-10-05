---
name: Nuestros Planes
descripcion: Sistema de diseño de Nuestros Planes (index.html). Extraído del código el 2026-09-27; al día con el rediseño REQ-UX-002 (paleta B "Profunda", DEC-014) el 2026-09-28.
colors:                     # variables de :root, index.html:14. Contraste: node check-contraste.js
  bg: '#0A0908'             # fondo de la app
  bg-header: '#0E0C0B'      # header y barra de pestañas
  bg-card: '#15120F'        # tarjetas, filas de categoría, perfil, login, filas de fotos
  bg-elevated: '#1E1A16'    # modales, avatares, hover/foco de campos
  bg-input: '#080706'       # campos
  bg-card-vencido: '#1C110F'
  bg-card-done: '#101812'   # tarjeta completada (negro verdoso)
  border: 'rgba(232,200,160,0.15)'         # bordes de tarjeta, 1px
  border-soft: 'rgba(232,200,160,0.17)'    # modal, login
  border-control: 'rgba(232,200,160,0.44)' # campos y botones secundarios, 3:1
  edge-light: 'rgba(255,232,200,0.08)'     # filo de luz: inset 0 1px 0
  copper: '#C98A48'         # acento único: activo, primario, foco, cursor
  copper-light: '#E6BC80'   # pestaña y filtro activos, brillo del metal
  copper-deep: '#94602E'    # pie del degradé metálico
  copper-dim: 'rgba(201,138,72,0.75)'      # bordes cobre, 3:1
  on-copper: '#120C06'      # texto sobre cobre lleno o metálico
  glow: 'rgba(201,138,72,0.13)'            # resplandor del fondo
  glow-strong: 'rgba(201,138,72,0.5)'      # halo del corazón, brillo de pestaña activa
  grain: 0.06               # opacidad del grano del fondo
  text-main: '#F5ECDD'
  text-soft: '#C8BCAC'
  text-muted: '#A39684'
  text-faint: '#8E8274'     # placeholders
  green-ok: '#7DBE93'       # completado
  green-ok-bg: '#0D2416'
  green-line: 'rgba(125,190,147,0.55)'     # borde de "Completar", 3:1
  red-venc: '#D5837A'       # vencido, error, eliminar
  red-venc-bg: '#2B1311'
  red-line: 'rgba(213,131,122,0.62)'       # borde de "Eliminar", 3:1
  white: '#FDFAF7'          # definida, sin uso hoy
  rgb: '--copper-rgb, --green-rgb, --red-rgb para rgba(var(--copper-rgb), a)'
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
motion:                     # variables de :root
  ease-out: 'cubic-bezier(0.22, 1, 0.36, 1)'
  dur-fast: 120ms           # presión de botón, salida de un modal
  dur: 200ms                # hover, foco, cambios de estado (--transition)
  dur-enter: 220ms          # tarjetas y filas que aparecen (slideUp)
  dur-modal: 240ms          # modales y pantalla de la app
spacing:
  contenido-max: 900px
  modal-max: 440px          # 400px foto de perfil, 560px carrusel
  corte-mobile: 600px       # único corte de ancho; aparte, (pointer: coarse) para el área táctil
---

# DESIGN.md — Nuestros Planes

Qué hay hoy en `index.html`, para que un elemento nuevo se vea igual que
lo que tiene al lado sin tener que buscarlo en 5.800 líneas. En el
encabezado, los valores exactos; abajo, cuándo se usa cada cosa.

## Cómo usarlo

- **Este archivo describe el código; no lo reemplaza.** Si algo de acá no
  coincide con el código, el error es de este archivo y se corrige en el
  mismo cambio.
- **Elemento nuevo en una pantalla existente:** si sus vecinos hacen algo
  distinto de lo que dice acá, se siguen los vecinos y se menciona la
  diferencia.
- **Pantalla o modal nuevo entero:** sigue este archivo.
- **Variables, no literales.** Los colores, radios y tiempos están en
  `:root` (`index.html:14`). Lo nuevo usa `var(--copper)`,
  `var(--radius-md)`, `var(--dur)`, etc. No se inventan tonos cercanos.
  Para transparencias del cobre, verde o rojo: `rgba(var(--copper-rgb), a)`.
  Un color nuevo se suma a `:root` **y** a `PARES` de `check-contraste.js`,
  y el script tiene que seguir en verde.
- **Clases, no inline.** Casi todo el estilo vive en el único `<style>` del
  `<head>`. Hay unos 15 `style="..."` en el HTML/JS, casi todos
  `display:none` o un ajuste chico. Un elemento nuevo usa las clases de
  abajo; si necesita estilo propio, se agrega una clase a la hoja.

## Tema

Oscuro y cálido: negro tostado, texto crema y **un solo acento cobre**,
tratado como metal. Tono íntimo y editorial, no de herramienta de trabajo.
Los títulos van en serif itálica y los controles en sans liviana, en
mayúsculas chicas y espaciadas. Bordes de 1px semitransparentes cálidos,
un filo de luz arriba de lo que está elevado y un resplandor cobre muy
tenue con grano en el fondo. No hay modo claro.

El color significa algo: cobre = acción o estado activo, verde =
completado, rojo = vencido, error o eliminar. Los colores de categoría
(abajo) son la única paleta variada, y la elige el usuario.

## Color

### Superficies y texto

Del fondo hacia arriba: `--bg` → `--bg-header` (header y pestañas) →
`--bg-card` (tarjetas, filas, perfil, login) → `--bg-elevated` (modales y
hover/foco de campos). Los campos van más hundidos que todo: `--bg-input`.

Cada superficie lleva borde de 1px (`--border`, o `--border-soft` en modal
y login). Tarjetas, filas, perfil, login y modales llevan además el
**filo de luz**: `box-shadow: inset 0 1px 0 var(--edge-light)`.

Texto: `--text-main` para contenido y títulos, `--text-soft` para datos de
apoyo (meta de la tarjeta, "Por …", mensajes, título de una completada),
`--text-muted` para labels, pestañas inactivas y estados vacíos,
`--text-faint` solo para placeholders. Los cuatro pasan 4,5:1 contra su
fondo real (`check-contraste.js`).

Bordes de controles (campos, botón secundario, "Reabrir"):
`--border-control`, que pasa 3:1. Los de tarjeta (`--border`) son más
suaves a propósito, pero con 1px se ven en una pantalla de densidad 1.

### Fondo

`body::before` pinta un resplandor cobre (`--glow`) arriba, y `body::after`
un grano fijo (SVG con `feTurbulence`, opacidad `--grain`). Los dos son
`position: fixed` detrás de todo. El grano es una imagen quieta, no un
filtro animado, para no costar en el celular. Solo va en el fondo: no se
repite en tarjetas ni modales.

### Cobre

- **Metal** (degradé `--copper-light` → `--copper` → `--copper-deep` de
  arriba abajo, brillo `inset 0 1px 0` y texto `--on-copper` en peso 500):
  solo la acción principal (`.btn-primary`), el botón de Google y "De
  acuerdo" cuando mi acuerdo ya está dado. Lo nuevo no suma más lugares:
  si todo es metal, nada lo es.
- **Activo con brillo:** pestaña activa (`--copper-light`, subrayado
  `--copper` y un brillo `--glow-strong` abajo) y filtro activo
  (`--copper-light` con un degradé cobre muy tenue de fondo).
- `--copper`: iconos y texto de acción, spinner, cursor.
- `--copper-dim`: bordes cobre (input con foco, avatar, "De acuerdo" sin
  activar).
- Hover de tarjetas y filas: borde `rgba(var(--copper-rgb),0.3)`.

### Estados

| Estado | Texto | Fondo | Borde | Dónde |
|---|---|---|---|---|
| Completado | `--green-ok` | `--green-ok-bg` (hover) | `--green-line` | `.btn-completar`, `.completado-label`, foto subida OK |
| Tarjeta completada | `--text-soft` (título tachado) | `--bg-card-done` | verde al 28 % | `.plan-card.completado` + `.estado-sello` |
| Vencido / error / eliminar | `--red-venc` | `--red-venc-bg` | `--red-line` (rojo al 40 % en la tarjeta) | `.vencido-badge`, `.plan-card.vencido` (fondo `--bg-card-vencido`), `.error-msg`, `.btn-danger`, `.btn-peligro`, foto con error |
| Esperando acuerdo (REQ-PLAN-001) | `--copper` | — | `--copper-dim` | `.estado-pill.esperando`, `.btn-acuerdo` sin activar |
| Lista para cerrar | `--bg` | `--copper` | `--copper` | `.estado-pill.lista` |
| Mi acuerdo dado | `--on-copper` | metal | `--copper` | `.btn-acuerdo[aria-pressed=true]` |
| Idea sin fecha (REQ-PLAN-003) | `--text-soft` | `--bg-card` | círculo punteado `--text-muted` | `.idea-card`, `.idea-marca` |
| Idea anotada hace más de 3 meses | `--amber` (`#DDB061`) | — | — | `.idea-anotada.vieja`, solo el texto "Anotada hace X" |

No hay azul. El ámbar es solo para avisar que una idea lleva más de 3 meses
sin fecha (Franco lo eligió en el mockup de "Algún día", DEC-018); no se usa
para otra cosa. El acuerdo para cerrar (REQ-PLAN-001, DEC-006) usa el cobre
porque es una acción en curso, no un color nuevo. Un estado nuevo que no sea
ninguno de estos se pregunta antes de inventar un color.

### Colores de categoría

`PRESET_COLORS` (`index.html:2756`): 12 pasteles que elige el usuario al
crear una categoría. El badge usa el color como texto y el mismo color con
alfa `22` como fondo (`background:${color}22;color:${color}`), siempre
pasado por `safeColor()`. No se usan para nada que no sea una categoría.
En una tarjeta completada el badge va desaturado (`saturate(0.55)`).

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
| Botón (`.btn`) | Jost | 0.78rem (0.7rem `.btn-sm`) | 400 (500 en metal y peligro), mayúsculas, `letter-spacing:.12em` | el de la variante |
| Pestaña, filtro, label | Jost | 0.7–0.74rem | 400, mayúsculas, `letter-spacing:.1–.14em` | `--text-muted` |
| Badge | Jost | 0.7–0.72rem | 400, mayúsculas, `letter-spacing:.08em` | el del estado o la categoría |

Regla: todo lo que es título o "voz" de la app va en DM Serif itálica, y
todo lo que es control va en Jost. Las negritas casi no se usan (el peso
máximo es 500). **Nada en mayúsculas por debajo de 0.7rem (11,2px)**,
tampoco en el celular.

## Forma, espaciado y movimiento

- **Radios:** cuanto más grande el contenedor, más radio: control 6px →
  tarjeta 10px → panel 16px → modal 20px. Los círculos (avatares,
  miniaturas, puntos de color, sello) van con `50%`.
- **Bordes:** 1px en todo. `1.5px` solo en casos puntuales (avatar
  grande, borde de miniatura superpuesta). Nada de `0.5px`: en una
  pantalla de densidad 1 desaparece.
- **Espacio:** `gap` de 0.5rem entre controles, 0.7–1rem entre tarjetas o
  filas, 1.5rem entre bloques (`margin-bottom` de `.section-header` y de la
  barra de filtros). Padding: 1.2rem en tarjetas y 2rem en modal y
  contenido (1rem en mobile).
- **Contenedor:** `.app-content`, `max-width:900px` centrado. La grilla de
  planes es `repeat(auto-fill, minmax(280px, 1fr))` y pasa a una columna
  en mobile.
- **Sombras:** pocas y con motivo: el filo de luz (`inset`) en lo
  elevado, una sombra corta debajo del modal y del botón metálico, y el
  anillo del sello. La elevación de tarjetas en hover sigue siendo borde
  cobre + `translateY(-2px)`, no sombra.
- **Transiciones:** `var(--transition)` en controles y tarjetas: 200ms
  (`--dur`) con `--ease-out`. Nombra sus propiedades (`color`,
  `background-color`, `border-color`, `opacity`, `transform`): si un
  estado nuevo cambia otra, se suma a la variable. Al presionar un `.btn`,
  `scale(0.98)` en `--dur-fast`.
- **Entradas:** tarjetas, filas y la card de recuerdos con `slideUp`
  (8px) en `--dur-enter`; la pantalla de la app con `fadeIn` en
  `--dur-modal`; el login con `fadeIn` en 300ms. **Nunca más de 300ms** en
  algo de interfaz, y siempre `--ease-out` (nada de `ease-in`). Lo
  decorativo en hover (el brillo que cruza la tarjeta, 0.45s) y los loops
  de marca (latido, spinner, skeleton) quedan afuera de esa regla.
- **Modales:** el overlay funde y el modal sube de `scale(0.97)
  translateY(8px)`: entran en `--dur-modal` y salen en `--dur-fast`
  (salir más rápido que entrar).
- **Sin cascadas:** las listas se vuelven a dibujar en cada guardado; una
  entrada escalonada por tarjeta las haría sentir lentas.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce`, un bloque
  al final del `<style>` apaga animaciones y transiciones (con
  `!important`) y la presión del botón, salvo los spinners (`.spinner`,
  `.carrusel-spinner`); en JS, `menosMovimiento()` deja las estrellas
  fijas, saca las chispas y el halo del cursor sigue sin demora. Un
  spinner nuevo se suma a la excepción; una animación JS nueva consulta
  `menosMovimiento()`.
- **Decoración de marca:** una línea de 1px con degradé cobre en el borde
  superior de `.modal` y `.login-card` (`::before`), el corazón metálico
  que late (`heartbeat`), las chispas al hacer click y el brillo de las
  tarjetas en hover. Una pantalla nueva no inventa decoraciones nuevas: si
  quiere una, usa la línea cobre del modal.

## Componentes

**Botón primario:** `class="btn btn-primary"`. Cobre metálico con texto
`--on-copper`; en hover el degradé se aclara. El spinner adentro es
oscuro. `.btn-primary` tiene `width:100%`, pensado para modales y login;
en la cabecera de sección `.section-header .btn` lo deja a su medida (va
con `btn-sm`). Uno por vista.

**Botón secundario / cancelar:** `class="btn btn-secondary"` (borde
`--border-control`, texto `--text-soft`).

**Botón destructivo:** dos variantes.
- `.btn-danger` (borde `--red-line`, transparente, más chico): "Eliminar"
  en la fila de categoría.
- `.btn-peligro` (rojo lleno al 12 %, peso 500): el botón de aceptar de
  `#modal-confirm` cuando lo que se confirma borra o descarta.
  `confirmarModal(mensaje, texto, peligro = true)` lo pone solo; con
  `peligro = false` (hoy, "Reabrir") el botón queda `.btn-primary`. En
  hover aclara el texto (`#EBA79F`) además del fondo, para no bajar de
  4,5:1.

Un borrado nuevo pasa por `confirmarModal`.

**Botón de solo icono:** `class="btn-icon"` con SVG de 15px y
`aria-label` que diga la acción y sobre qué. La tarjeta de plan ya no
tiene iconos de editar ni eliminar (REQ-UX-003): están en el menú "⋯"
del detalle.
Todo `<button>` lleva `type="button"` (BL-018).

**Botón de completar:** `.btn-completar` (verde, borde `--green-line`) en
la tarjeta de un plan pendiente. Cuando está completado se reemplaza por
`.completado-label` con un check y el botón "Reabrir" (`.btn-reabrir`).

**Guardar que espera respuesta:** el botón pasa a
`innerHTML = '<span class="spinner"></span>'` y `disabled = true` hasta que
vuelve el servidor (ver `savePlan`, `index.html:4919`). Lo nuevo copia ese
patrón. En la tarjeta, "Guardando…" y "Reabriendo…" (DEC-012).

**Pestañas y filtros:** `.nav-tab` (subrayado cobre con brillo cuando
está activa) y `.filter-chip` (borde `--copper-dim`, texto
`--copper-light` y fondo cobre tenue cuando está activo). Ambos son
`<button type="button">`.

**Tarjeta de plan:** `.plan-card` dentro de `.plans-grid`, en este orden:
header (categoría y estado), `.plan-titulo`, `.plan-meta` (fechas con
iconos de 11px), `.plan-creator` (avatar de 20px + "Por …"), el acuerdo
(`.plan-acuerdo`) y `.plan-card-actions`. Toda la tarjeta abre el detalle
(REQ-UX-003): el título es un `<button class="plan-titulo-btn">` con
chevron, y su `::after` cubre la tarjeta entera; los botones de
`.plan-card-actions` quedan encima (`z-index: 1`). Con Tab, el contorno
cobre se dibuja alrededor de la tarjeta. No se meten botones adentro del
botón del título. En hover: borde cobre, sube 2px,
un brillo cruza la tarjeta y una línea cobre de 1px crece arriba
(`::after`, hasta 55 %). Variantes:
- `.completado`: fondo `--bg-card-done`, borde verde al 28 %, línea verde
  fija de 2px arriba a todo el ancho (en cobre mientras dice
  "Reabriendo…"), título tachado en `--text-soft` y badge desaturado. Sin
  `opacity`: al 55 % no se leía.
- `.vencido`: fondo `--bg-card-vencido`, borde rojo al 40 %, título en
  `--red-venc`.

**Sello de completada:** `.estado-sello`, círculo verde de 30px con un
tilde, un anillo verde tenue y brillo arriba. Reemplaza la píldora
"Completada": `htmlEstadoPill` lo devuelve con `role="img"` y
`aria-label="Completada"`.

**Badge y píldora de estado:** `.categoria-badge` (con un punto
`::before` del color), `.vencido-badge` y `.estado-pill` (esperando, lista
para cerrar). Radio 6px, no pastilla. Son solo estado, nunca una acción.

**Fila de lista:** `.categoria-row` (punto de color, nombre y acciones a
la derecha), con filo de luz.

**Formulario:** `.form-group` con `<label>` arriba (mayúsculas, muted) y
el campo a todo el ancho, fondo `--bg-input` y borde `--border-control`.
En foco, el borde pasa a `--copper-dim` y el fondo a `--bg-elevated`; con
teclado, además, un outline cobre de 1px. Los `<select>` llevan la flecha
SVG propia y `option` con fondo oscuro explícito. Los obligatorios se
marcan con " *" en el label y los opcionales con "(opcional)".

**Error de formulario:** `.error-msg` debajo de las acciones, visible con
`.visible`. El texto dice qué corregir ("El título y la fecha programada
son obligatorios.").

**Error o confirmación de un campo** (REQ-PLAN-002): `.campo-error` /
`.campo-ok` justo debajo del campo, con ícono SVG, en `--red-venc` /
`--green-ok`; el campo lleva `aria-invalid="true"` (borde `--red-line`) y
el foco. Se usa cuando el problema es de un campo puntual.

**Modal:** `.modal-overlay` (fondo `rgba(8,7,6,0.75)` + `blur(4px)`,
visible con `.visible`) > `.modal` (`--bg-elevated`, filo de luz y sombra
corta) > `.modal-header` (h3 + `btn-icon` de cerrar con la X SVG) >
contenido > `.modal-actions` (a la derecha: `btn-secondary` Cancelar y
después la acción). Un modal alto scrollea dentro (`max-height:100%;
overflow-y:auto`). El `blur` es solo del overlay de un modal: no se usa en
listas ni tarjetas. Mostrar y ocultar: ver `convenciones-tecnicas`, tema
pantallas y visibilidad.

**Estado vacío:** `.empty-state` con una frase en DM Serif itálica ("No
hay planes aquí todavía.") y un adorno arriba: `.empty-icon`, un SVG de
línea de 2rem, cobre al 35% (estrella de cuatro puntas en planes, rombo en
categorías).

**Carga:** `.spinner` (14px, cobre; oscuro dentro del botón metálico) en
botones y miniaturas; skeletons con el brillo `skeletonShimmer`
(`.skeleton-card`, card de fotos con `.is-loading`) mientras carga la app.
El error de carga (`#app-loading`, BUG-CARGA-001) muestra el motivo y un
botón Reintentar.

**Fotos de una tarea (REQ-MEDIA-004):** en el modal de la tarea, "Ya
subidas" (`.plan-fotos-ya`, grilla de miniaturas `.foto-ya` con la inicial
de quién la subió y la fecha) y "Por subir" (`.foto-fila`, una por foto,
fondo `--bg-card`). Cada fila lleva una `.foto-pill` con texto: *Lista
para subir* (neutra), *En espera* (muted), *Subiendo* (cobre, con
spinner), *Subida* (verde) y *Error* (rojo, con el motivo en su propia
línea). Sin colores nuevos. Subir pide confirmación en
`#modal-subir-fotos` (DEC-007).

**Recuerdos (REQ-MEDIA-003):** la card del dashboard
(`.fotos-recientes-card`, `role="button"` con Enter/Espacio) muestra un solo
grupo: `.fotos-recientes-grupo` en mayúsculas chicas (cobre con
`.is-destacado` para "En este día", muted para los otros) y una línea que
se corta con `…`. En el modal, `.recuerdos-chip` (mismo aspecto que
`.filter-chip`, activo con `aria-pressed="true"`, no con `.active`) y
`.carrusel-contador` ("2 de 5") debajo de la leyenda.

**Avatar:** `.avatar` (30px, 72px con `.avatar-lg`), círculo con borde
`--copper-dim`; sin foto, muestra la inicial en cobre.

**Mi perfil (REQ-MEDIA-007):** por secciones de 420px de ancho máximo. Arriba
`.perfil-card` con la foto y el nombre en fila y `.perfil-link` ("Cambiar
foto", cobre claro, 44px de alto con el dedo). Cada sección es
`.perfil-seccion` con un `.perfil-seccion-titulo` (Jost 0.72rem en
mayúsculas, `--text-muted`, como los labels) y una `.perfil-card` con
padding de 1.2rem. Opciones excluyentes: `.perfil-opcion`, un `<label>` con
un radio nativo (`appearance: none`, 18px, borde `--border-control`,
marcado en cobre con el centro de `--bg-card`), título en `--text-main` y
descripción en `--text-muted`, separadas por un borde `--border`. Un dato
de solo lectura va en `.perfil-fila` (nombre a la izquierda, valor a la
derecha). Un ajuste nuevo se suma como otra sección. Desde 720px de ancho
(1.6.1), `.perfil-layout` pasa a dos columnas (240px y el resto): a la
izquierda la cuenta (foto arriba y centrada) y "Acerca de"; a la derecha
los ajustes. La tarjeta de la cuenta baja la altura de un título de sección
para alinearse con la primera tarjeta de la derecha. Un ajuste nuevo va en
la columna derecha.

**Corazón de la marca:** SVG relleno con `url(#np-heart-metal)`, un
degradé cobre metálico definido una sola vez en un `<svg>` oculto al
principio del `<body>`, más un reflejo arriba a la izquierda y un halo
(`drop-shadow` con `--glow-strong`). Va en el logo del header y en el
login, donde se agrega un anillo cobre de 1px y 64px. Un corazón nuevo
reusa ese `id`, no define otro degradé.

## Iconos

- **SVG de línea, siempre.** Lo nuevo usa el formato más reciente del
  archivo: `viewBox="0 0 24 24"`, `fill="none"`,
  `stroke="currentColor"`, `stroke-width` 1.8 (cerrar, cámara) o 2
  (más, flechas, check), `stroke-linecap="round"`,
  `aria-hidden="true"`. El tamaño lo pone el CSS del contenedor (15px en
  `.btn-icon`, 0.95em dentro de `.btn`). La excepción es el corazón de la
  marca, que va relleno (ver Componentes).
- Los iconos de la tarjeta de plan (calendario, reloj, lápiz de "Creado
  el") son de una generación anterior: `viewBox` de 14 u 11, trazo de
  0.9–1 y tamaño fijo en el atributo. No se copian para un icono nuevo.
- No hay un set central: cada SVG está pegado donde se usa. Si un icono
  nuevo se repite en varios lugares, se define una vez como constante.
- **Sin glifos como iconos** desde BL-004 (2026-09-27): los `✦`, `◇` y
  `✕` que quedaban son SVG (estado vacío y overlay de foto con error, que
  usa la misma cruz que cerrar sesión, a 1rem). No se suman glifos
  nuevos. La flecha `→` de "Ver recuerdos →" es texto, no un icono.
- El `♡` del `<title>` es parte del nombre de la marca: no aplica.

## Excepciones

- **Cursor propio:** con mouse real (`(hover: hover) and (pointer:
  fine)`), la app oculta el cursor (`cursor:none` en `body` y en cada
  clickeable) y dibuja un punto y un halo cobre que crece sobre lo
  clickeable (`CLICKABLE_SEL`, `index.html:2785`). Es identidad de la app
  y reemplaza la regla "cursor pointer" de `hjay-identidad-visual`. Un
  elemento clickeable nuevo: `cursor:none` en su clase y, si no es
  `button`, `a` ni `input`, sumarlo a `CLICKABLE_SEL` para que el halo
  reaccione. La única excepción hoy es `.retry-btn` de `#app-loading`, con
  `cursor:pointer` (sin motivo documentado).
- **Login:** tiene su propio fondo (degradés cobre radiales y canvas de
  estrellas), el corazón en su anillo y el botón de Google en cobre
  metálico con barrido de luz y la G de colores en un chip oscuro. No se
  copia al resto de la app.
- **Mobile (≤600px):** el único corte. Achica paddings, pestañas más
  chicas (sin bajar de 0.7rem), grilla de planes en una columna y carrusel
  cuadrado. Los ajustes de mobile de un componente nuevo van dentro de ese
  mismo bloque (`index.html:2310`).
- **Área táctil (`pointer: coarse`):** con el dedo, todo lo que se toca
  mide al menos 44px. Si el botón se ve más chico, el área se agranda sin
  cambiar cómo se ve: un `::before` absoluto con `inset` negativo (botones
  de la tarjeta, BL-026) o un botón más grande que su dibujo (círculos de
  color: botón de 34px, 44px con el dedo, y el círculo de 26px es su
  `::before`, BL-022). Se usa `pointer: coarse` y no el ancho: una
  computadora angosta sigue con mouse, y una tablet ancha, con el dedo.

## Deudas conocidas

Cosas que el código hace distinto del criterio de `hjay-identidad-visual`.
Lo nuevo no las copia. Arreglar lo existente es aparte (backlog), no se
hace de paso.

- Lo que listaba BL-018 (`--transition: all`, sin movimiento reducido,
  `<label>` sin `for`, campos sin `:focus-visible`, `color-scheme`,
  botones sin `type`/`aria-label`) se saldó el 2026-09-27. Un campo nuevo
  lleva `for`; su foco con teclado es el outline cobre de 1px de
  `.form-group`.
- El contraste bajo que listaba BL-034 (texto apagado a 3:1, bordes de
  0.5px) se saldó con REQ-UX-002 el 2026-09-28.

## No hacer

- Un segundo acento (azul, violeta, ámbar) o un tono "parecido" al cobre.
- Metal en más lugares que los tres de arriba, o degradés nuevos fuera
  del cobre metálico y del resplandor del fondo.
- `backdrop-filter` o vidrio en listas y tarjetas, bordes animados,
  brillos que siguen al mouse, fuentes nuevas (fuera de alcance por
  REQ-UX-002 / DEC-013).
- Blanco puro en texto, negrita (más de 500) o títulos en Jost.
- Mayúsculas por debajo de 0.7rem, o bordes de 0.5px.
- Movimiento de más de 300ms en interfaz, `ease-in`, o una animación que
  no se apague con movimiento reducido.
- Pastillas redondas para acciones; los badges son solo estado.
- Colores de categoría fuera de un badge o punto de categoría.
- Glifos o emojis como iconos.

## Mantenimiento

Lo mantiene Jay. Se actualiza en el mismo cambio que agrega o cambia algo
de este archivo (una variable de `:root`, un componente con clase propia,
un corte de pantalla, un icono repetido que pasa a constante, una deuda
que se salda). Para revisar que siga vigente: comparar `:root`, los
`@media` y las clases de la hoja de estilos contra este archivo, correr
`node check-contraste.js` (tiene que dar todos los pares en verde),
confirmar que no volvieron glifos con `grep -n "✦\|◇\|✕" index.html` y
que no volvieron bordes finos con `grep -n "0\.5px solid" index.html`
(los dos tienen que dar vacío).
