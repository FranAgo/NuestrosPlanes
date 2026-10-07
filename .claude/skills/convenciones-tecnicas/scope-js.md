# Nombres en el JS de `index.html`

`index.html` usa un `<script>` clásico, sin módulos ni `"use strict"`.
Un nombre mal escrito o una función que no existe no dan error de
sintaxis: fallan recién cuando esa línea se ejecuta, y `node
check-sintaxis.js` pasa igual.

## Una función que se llama tiene que existir

**Qué cuidar:** al sumar una llamada a una función nueva, confirmar que
la declaración está en el archivo antes de dar el cambio por terminado:
`grep -n "function nombre(" index.html` (o `const nombre =`). Lo mismo al
renombrar o borrar una función: buscar todas sus llamadas. Una llamada que
corre al cargar la app rompe el arranque entero.

**Por qué:** REQ-PERF-003 (bitácora 2026-09): quedó una llamada a
`showFotosRecientesSkeleton()` sin la función declarada, un
`ReferenceError` apenas cargara la app. Lo frenó Jay antes de llegar a
Duck; `check-sintaxis.js` no lo habría visto.

