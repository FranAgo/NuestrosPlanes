# REQ-UX-002 — Rediseño visual premium (con contraste legible)

> **Estado:** CERRADO (2026-09-28)
> **Historia:** CERRADO el 2026-09-28 (en prod como 1.3.1). Fase 1 cerrada el 2026-09-28: Franco eligió la paleta B, la tarjeta completada con sello + línea verde y el corazón metálico (DEC-014). Fases 2 (base global), 3 (componentes) y 4 (movimiento, pulido y `docs/DESIGN.md`) hechas el 2026-09-28, sin deploy. Fase 5: verificada y **en producción como 1.3.0** desde el 2026-09-28 19:12 (push de `4f93539` con OK de Franco, tag `v1.3.0`, Pages confirmado con curl). Franco lo vio en la PC y en el iPhone (de ahí salió 1.3.1) y revisó `DESIGN.md`. Si Noelia nota algo en su celular, Franco avisa: no queda como pendiente (Franco, 2026-09-28). Versión: 1.3.0 (DEC-009: un REQ nuevo sube la versión menor). Puede salir por fases como 1.3.0, 1.3.1, etc.
> **Nivel:** cambio de fondo (toca todas las pantallas), solo front: `Code.gs` no cambia ni cambia ningún contrato.
> **Dueño técnico:** Jay (diseño y front) · **QA:** Duck · **PM:** Paul · **Deploy:** Roy (solo GitHub Pages) · Julia y Gary: sin superficie de seguridad ni de hojas (se confirma al cerrar).
> **Versión:** 1.3.0
> **Origen:** BL-034
> **Absorbe:** BL-034 (contraste). Se cruza con BL-012 (revisión de `docs/DESIGN.md`), BL-026 (área táctil) y BL-027 (visor de fotos).

## Problema

Franco (2026-09-28): los colores de fondo, las letras y los contornos "son
difíciles de ver a veces", en general. La app tiene buenas bases pero le
faltan "detalles de lujo"; quiere que pase a verse más premium **sin perder
el efecto que tiene hoy**, y con criterio (no aplicar todo lo que se
encuentre). Franco usa más la PC; Noelia, el celular.

Medición (BL-034): `--text-muted` 3,0:1 (30 usos), `--text-faint` 2,1,
`--red-venc` 4,0, bordes 1,2-1,3, borde cobre de botones 2,0, texto de una
tarjeta completada 2,7. Los 37 bordes de 0,5 px casi desaparecen en una
pantalla de densidad 1 (la PC).

Investigación y criterio de Jay (qué entra y qué no, con fuentes):
`docs/investigacion/2026-09-28-diseno-premium.md`.

## Alcance

Entra:
1. **Paleta y superficies:** tres niveles de superficie cálidos (fondo,
   tarjeta, elevado), bordes de 1 px semitransparentes cálidos, filo de
   luz arriba de tarjetas y modales, tres niveles de texto que pasan 4,5:1,
   rojo y verde ajustados.
2. **Cobre como metal:** degradé sutil y brillo interno solo en la acción
   principal y en lo activo (pestaña, filtro, "De acuerdo").
3. **Atmósfera:** resplandor cobre muy tenue arriba del fondo y grano
   suave, solo en el fondo.
4. **Componentes:** header y pestañas, tarjeta de tarea (incluida la
   completada), botones, inputs, chips de filtro, píldoras de estado, fila
   de acuerdo, modales, card de recuerdos y "Ya subidas", login, perfil,
   categorías.
5. **Tipografía y aire:** mismas fuentes; más espacio y ritmo; ninguna
   etiqueta en mayúsculas por debajo de ~11 px.
6. **Movimiento:** presión de botón, entradas `ease-out` de 150-250 ms,
   todo apagado con `prefers-reduced-motion`.
7. **`docs/DESIGN.md`** actualizado con los valores nuevos (cierra la
   revisión pendiente de BL-012).

No entra: `backdrop-filter`/glass en listas, bordes animados, brillos que
siguen al mouse, fuentes nuevas, colores nuevos fuera de cobre/verde/rojo,
cambios de flujo o de funciones (esto es solo cómo se ve).

## Fases

1. **Tokens + mockup (sin tocar la app).** Jay arma la paleta nueva y un
   mockup antes/después sobre pantallas reales (tarjeta pendiente,
   completada, modal, formulario, login), a escala de PC y de celular.
   Franco elige. *Criterio de salida: Franco aprueba la paleta.*
2. **Base global.** Variables de `:root`, fondo, bordes, texto, botones,
   inputs. Es lo que más se nota con menos riesgo.
3. **Componentes uno por uno** (orden: tarjeta de tarea, modales, fotos,
   login/perfil/categorías), con verificación visual de cada uno.
4. **Movimiento y pulido final.**
5. **Verificación completa y deploy** (con OK explícito de Franco).

## Criterios de aceptación

1. Todo texto pasa 4,5:1 contra su fondo real (incluida la tarjeta
   completada); el texto chico apunta a 7:1 cuando no rompe el diseño.
2. Los bordes de campos y botones pasan 3:1; los de tarjetas se ven a
   densidad 1 (PC) sin verse pesados.
3. Un script de medición (Node, sin dependencias) calcula el contraste de
   cada par definido en `:root` y queda en el repo para repetirlo.
4. Nada nuevo por debajo de 60 fps al hacer scroll en la lista en un
   celular (sin `backdrop-filter` en listas; grano como imagen fija, no
   filtro animado).
5. `prefers-reduced-motion` apaga todo el movimiento nuevo.
6. Verificado a 375, 600/601 y 1366 de ancho, con consola limpia, y visto
   por Franco en su PC y por Noelia en su celular.
7. `docs/DESIGN.md` coincide con el código al cerrar.

## Resultado de la fase 1 (2026-09-28)

Mockup interactivo (Artifact, no versionado) con la paleta actual al lado
de A "Cálida" y B "Profunda". Franco eligió **B** (DEC-014).

`check-contraste.js` quedó en la raíz del repo (criterio 3). Contra
`index.html` 1.2.4 da 12 pares por debajo del mínimo; con la paleta B pasan
todos.

Variables de la paleta B para `:root` (fase 2):

| Variable | Valor | Para qué |
|---|---|---|
| `--bg` | `#0A0908` | fondo |
| `--bg-header` | `#0E0C0B` | header y pestañas (al 88 %, deja ver el resplandor) |
| `--bg-card` | `#15120F` | tarjetas |
| `--bg-elevated` | `#1E1A16` | modales (nuevo) |
| `--bg-input` | `#080706` | campos (nuevo) |
| `--bg-card-vencido` | `#1C110F` | reemplaza el literal `#1A1010` |
| `--bg-card-done` | `#101812` | tarjeta completada: negro verdoso, par del negro rojizo del vencido (pedido de Franco durante la fase 2) |
| `--border` | `rgba(232,200,160,0.15)` | bordes de tarjeta, 1 px |
| `--border-soft` | `rgba(232,200,160,0.17)` | modal, login |
| `--border-control` | `rgba(232,200,160,0.44)` | campos y botones secundarios, 3:1 (nuevo) |
| `--edge-light` | `rgba(255,232,200,0.08)` | filo de luz `inset 0 1px 0` (nuevo) |
| `--copper` | `#C98A48` | acento |
| `--copper-light` | `#E6BC80` | pestaña y filtro activos, brillo del metal |
| `--copper-deep` | `#94602E` | fondo del degradé metálico (nuevo) |
| `--copper-dim` | `rgba(201,138,72,0.75)` | bordes cobre, 3:1 |
| `--on-copper` | `#120C06` | texto sobre cobre lleno (nuevo) |
| `--glow` / `--glow-strong` | `rgba(201,138,72,0.13)` / `0.5` | resplandor del fondo, halo del corazón (nuevo) |
| `--grain` | `0.06` | opacidad del grano (nuevo) |
| `--text-main` | `#F5ECDD` | |
| `--text-soft` | `#C8BCAC` | |
| `--text-muted` | `#A39684` | 6,45:1 sobre tarjeta |
| `--text-faint` | `#8E8274` | placeholders, 5,36:1 |
| `--green-ok` / `--green-ok-bg` | `#7DBE93` / `#0D2416` | |
| `--red-venc` / `--red-venc-bg` | `#D5837A` / `#2B1311` | |

Además del color:
- **Tarjeta completada:** opacidad 1, fondo `--bg-card-done`, borde verde al
  28 %, línea verde fija de 2 px arriba (el `::after` del hover, a ancho
  completo), sello verde de 30 px con tilde en lugar de la píldora
  "Completada" (con `role="img"` y `aria-label`), título tachado en
  `--text-soft`, fotos con `grayscale(0.7) brightness(0.8)`.
- **Corazón:** relleno con degradé cobre metálico (`#F0CC95` → `#C98A48` →
  `#8A5526`), un reflejo arriba a la izquierda y halo con `drop-shadow`;
  en el login, dentro de un anillo cobre de 1 px. Reemplaza el de contorno.
- **Acción principal y botón de Google:** degradé metálico con texto
  `--on-copper`, peso 500.

## Resultado de la fase 2 (2026-09-28)

Hecho en `index.html`, sin deploy:
- `:root` con la paleta B y las variables nuevas, incluidas `--copper-rgb`,
  `--green-rgb` y `--red-rgb` para `rgba(var(--copper-rgb), a)`, y
  `--green-line` / `--red-line` (bordes de "Completar" y "Eliminar", 3:1).
- Los 37 bordes de 0,5 px pasan a 1 px. Los literales del cobre viejo, de
  `#1A1612`, `#1E1A14`, `#1A1010` y de los rojos y verdes viejos pasan a
  variables. Las chispas del click usan el cobre nuevo.
- Fondo con resplandor cobre y grano (`body::before` y `::after`, fijos).
- `.btn-primary` de cobre metálico (spinner oscuro adentro), presión
  `scale(0.98)` en `.btn` (apagada con movimiento reducido), secundario y
  "Reabrir" con `--border-control`.
- Campos con `--bg-input` y `--border-control`. Pestaña y filtro activos
  con brillo.
- Arreglo de paso: `.btn-primary` tenía `width:100%` también en la cabecera
  de sección y apretaba el título ("Nuestros / Planes" en dos renglones). No
  se notaba con el botón transparente; ahora la cabecera lo deja a su
  medida (`.section-header .btn`).

Verificado en 127.0.0.1 con `fetch` simulado (ninguna llamada a prod), a
1366, 601, 600 y 375: sin scroll horizontal, consola sin errores, foco con
teclado visible en los campos del modal. `check-contraste.js` y
`check-sintaxis.js` en verde. El hover de las tarjetas no se miró a 1366
(solo cambió el color del borde).

Quedan para la fase 3, que no tocó esta fase: fondo del botón de Google
(`#1C1712` a `#141110`) y de `.foto-fila` (`#13100D`), la tarjeta
completada, los modales en `--bg-elevated`, el corazón y el login. En la
fase 3 hay que decidir el botón "Eliminar" del modal de confirmación
(`#btn-accept-confirm`): hoy usa `.btn-primary`, así que queda en cobre
metálico para una acción destructiva.

## Resultado de la fase 3 (2026-09-28)

Hecho en `index.html`, sin deploy:
- **Tarjeta completada (DEC-014):** fondo `--bg-card-done` (negro
  verdoso), borde verde al 28 %, línea verde fija de 2 px arriba (el
  `::after` del hover, a ancho completo; en cobre mientras dice
  "Reabriendo…"), título tachado en `--text-soft` y badge de categoría
  desaturado. Sin `opacity`. `htmlEstadoPill` devuelve para `completada` un
  sello (`.estado-sello`, `role="img"`, `aria-label="Completada"`) en lugar
  de la píldora.
- **Tarjetas, perfil y categorías:** filo de luz arriba. La vencida lleva
  un borde rojo al 40 %.
- **Modales:** `--bg-elevated`, filo de luz y una sombra corta.
- **Confirmación:** `confirmarModal(mensaje, texto, peligro = true)`. Con
  `peligro`, `#btn-accept-confirm` es `.btn-peligro` (rojo): "Eliminar" y
  "Descartar y cerrar". "Reabrir" pasa `false` y queda en cobre
  (`.btn-primary`). En hover, `.btn-peligro` aclara el texto (`#EBA79F`),
  porque con el fondo más rojo el texto bajaba de 4,5:1.
- **Corazón metálico** (logo y login) con `url(#np-heart-metal)`: el
  degradé se define una vez, en un `<svg>` oculto al principio del
  `<body>`. En el login va en un anillo cobre de 64 px.
- **Botón de Google** en cobre metálico, con la G de colores en su chip
  oscuro. La carga se ve apagada (`saturate` y `brightness`).
- **Filas de fotos** con `--bg-card` (antes `#13100D`).
- **Mayúsculas de al menos 11 px** (punto 5): `.estado-pill`,
  `.vencido-badge` y pestañas en el celular, de 0,65 a 0,7 rem.

Verificado en 127.0.0.1 con `fetch` simulado (ninguna llamada a prod), a
1366, 601, 600 y 375: sin scroll horizontal, consola sin errores, sello de
30 px, pestañas en 11,2 px a 375 y 600. Las tres confirmaciones abren con
la clase correcta y se cerraron sin aceptar. `check-sintaxis.js` y
`check-contraste.js` en verde.

Ojo al verificar: con el Browser pane oculto, las transiciones no avanzan
(un `getComputedStyle` en medio da el valor viejo), y después de varios
cambios de tamaño las capturas salen achicadas. Medir con JS, no con la
captura.

## Resultado de la fase 4 (2026-09-28)

Hecho en `index.html` y `docs/DESIGN.md`, sin deploy:
- **Tiempos en `:root`:** `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`),
  `--dur-fast` 120 ms, `--dur` 200 ms, `--dur-enter` 220 ms y
  `--dur-modal` 240 ms. `--transition` pasa de 0,22 s con la curva
  estándar a `--dur` con `--ease-out`.
- **Entradas:** `slideUp` (tarjetas, filas, card de recuerdos) de 0,3 s y
  12 px a 220 ms y 8 px; la pantalla de la app de 0,4 s a 240 ms; el login
  de 0,6 s a 300 ms. La línea cobre del hover de la tarjeta, de 0,3 s a
  250 ms.
- **Modales:** entran en 240 ms y salen en 120 ms (salir más rápido que
  entrar); el modal sube de `scale(0.97) translateY(8px)`.
- **Presión de botón:** `scale(0.98)` en 120 ms (vuelve en 200 ms).
- **Se quedan como estaban**, porque son parte del efecto que Franco quiere
  conservar o son loops de marca: el brillo que cruza la tarjeta en hover
  (0,45 s), el latido del corazón, las chispas, el skeleton y los
  spinners. **No se sumó** una entrada escalonada de la lista: la lista se
  vuelve a dibujar en cada guardado y se sentiría lenta.
- **Movimiento reducido:** el bloque existente ya apaga todo con
  `!important`, incluidos los tiempos nuevos; no hizo falta tocarlo.
- **Pulido:** "De acuerdo" activo pasa al cobre metálico (el alcance lo
  pedía y había quedado plano). Las cinco etiquetas en mayúsculas que
  seguían por debajo de 0,7 rem (`.plan-fotos-sub`, `.plan-fotos-dia`,
  `.btn-mini`, `.foto-pill`, `.fotos-recientes-grupo`) pasan a 0,7 rem;
  lo encontró Duck al contrastar `DESIGN.md` con el código.
- **`check-contraste.js`:** dos pares nuevos para el texto sobre el metal
  (`--on-copper` sobre `--copper`, 6,67:1, y sobre el degradé al 80 % del
  alto, `#B57A3E`, 5,38:1). El script acepta ahora un color literal
  `#…` para medir un punto de un degradé. `--on-copper` sobre
  `--copper-deep` da 3,67:1, pero ese tono está en el 120 % del degradé,
  fuera del botón.
- **`docs/DESIGN.md`** reescrito con la paleta B, bordes de 1 px, filo de
  luz, fondo, metal (solo en tres lugares), estados, sello, `.btn-peligro`,
  corazón, tiempos y las reglas nuevas de "No hacer" (criterio 7).

Diferencias con lo escrito antes: la tabla de la fase 1 dice que el header
va "al 88 %", pero en el código es opaco (`--bg-header` lleno);
`DESIGN.md` describe el código. Lo de "fotos con `grayscale`" de la
tarjeta completada no aplica: la tarjeta no muestra miniaturas, solo "N
fotos".

Verificado en 127.0.0.1 con `fetch` simulado (ninguna llamada a Apps
Script): tiempos y curvas medidos con `getComputedStyle` (entradas,
modal abierto y cerrado, botón); a 375, las cinco etiquetas en 11,2 px, en
un renglón y sin desborde (filas "Por subir" con "Lista para subir",
"Error" y "Reintentar", card de recuerdos con "De otro momento"), sin
scroll horizontal. Consola: solo tres 404 de las fotos de prueba
inyectadas sin `src`. `check-sintaxis.js` y `check-contraste.js` en
verde.

## Fase 5: verificación antes del deploy (2026-09-28)

`APP_VERSION` 1.3.0 solo en `index.html`; `Code.gs` sigue en 1.2.2 porque
el servidor no cambia (igual que 1.2.3 y 1.2.4). CHANGELOG con la entrada
1.3.0.

Verificado en 127.0.0.1 con `fetch` simulado (ninguna llamada a Google),
recorriendo en cada ancho las pestañas Planes, Categorías y Mi perfil y
los modales de editar plan, nuevo plan, categoría y confirmar eliminar:

| Criterio | Resultado |
|---|---|
| 1. Texto 4,5:1 | `check-contraste.js` en verde (incluye completada y metal). |
| 2. Bordes 3:1 y visibles a densidad 1 | Bordes de campos y botones medidos 3:1; 1px en todo (`grep "0.5px solid"` vacío). |
| 3. Script de medición | `check-contraste.js` en el repo. |
| 4. Sin costo de scroll nuevo | Sin `backdrop-filter` fuera de los overlays de modal (que ya lo tenían: BL-035); grano sin animación. No medido en un celular real. |
| 5. Movimiento reducido | El bloque apaga todo con `!important`, incluidos los tiempos nuevos. |
| 6. 375, 600/601 y 1366, consola limpia | Sin scroll horizontal, nada fuera de la pantalla, ninguna mayúscula por debajo de 11,2px y los cuatro modales entran enteros, en los cuatro anchos (el corte de 600 confirmado con `matchMedia` a los dos lados). Hover de tarjeta a 1366: borde cobre, sube 2px, línea al 55 %. Consola sin errores. Después del deploy lo vio Franco en la PC y en el iPhone (1.3.1). Lo de Noelia no queda pendiente: si nota algo, Franco avisa. |
| 7. `DESIGN.md` al día | Reescrito en la fase 4 y contrastado con el código. Revisado por Franco el 2026-09-28 (BL-012). |

Julia: sin superficie de seguridad (solo CSS y el aspecto del botón de
confirmar; ningún dato ni endpoint nuevo). Gary: sin cambios en las hojas.
Roy: el deploy es solo `git push origin main` (GitHub Pages) y el tag
`v1.3.0`; sin `clasp`.

## Después del deploy: 1.3.1 (2026-09-28)

Franco, en su iPhone con 1.3.0 (captura del modal "Editar plan"): los
campos de fecha se veían "sobrepuestos y desplazados". "Empieza" quedaba
debajo de "Termina", "Fecha de vencimiento" se salía del modal por la
derecha y la fecha aparecía centrada. En Safari de iOS, el `input
type="date"` nativo tiene un ancho mínimo propio y no respeta
`width:100%`. Seguramente pasaba desde REQ-MEDIA-005, pero no se veía:
con el fondo igual al del modal y el borde de 0,5 px, el campo casi no se
distinguía. El borde de 1 px y `--bg-input` lo dejaron a la vista.

Arreglo: `.form-group input[type="date"]` sin apariencia nativa,
`min-width: 0`, `max-width: 100%`, `min-height: 2.9rem` (vacío no queda
más bajo) y la fecha alineada a la izquierda
(`::-webkit-date-and-time-value`). En Chromium a 375 no cambia nada (los
tres campos quedan dentro de su columna, con el ícono del calendario). El
motor de iOS no se puede reproducir acá. **Franco lo confirmó en el iPhone
el 2026-09-28** ("quedó perfecto").
