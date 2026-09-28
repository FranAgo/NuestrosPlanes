# REQ-UX-002 — Rediseño visual premium (con contraste legible)

> **Estado:** APROBADO (2026-09-28, Franco). Sin implementar: la próxima sesión arranca por la fase 1 (paleta + mockup para que Franco elija).
> **Nivel:** cambio de fondo (toca todas las pantallas), solo front: `Code.gs` no cambia ni cambia ningún contrato.
> **Dueño técnico:** Jay (diseño y front) · **QA:** Duck · **PM:** Paul · **Deploy:** Roy (solo GitHub Pages) · Julia y Gary: sin superficie de seguridad ni de hojas (se confirma al cerrar).
> **Versión:** 1.3.0 (DEC-009: un REQ nuevo sube la versión menor). Puede salir por fases como 1.3.0, 1.3.1, etc.
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
