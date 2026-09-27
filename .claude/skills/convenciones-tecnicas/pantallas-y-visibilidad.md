# Mostrar y ocultar pantallas, overlays y modales

`index.html` alterna pantallas (login, carga, app) y modales. Dos veces
terminó en pantalla negra por mezclar formas de ocultar.

## El atributo `hidden` pierde contra cualquier `display` de la hoja

**Qué cuidar:** el `display:none` que pone el navegador para `[hidden]`
tiene menos prioridad que cualquier `display` de nuestro CSS. La regla
`[hidden] { display: none !important; }` del reset lo cubre: no sacarla,
y si se usa otra forma de ocultar, probar que el elemento de verdad
desaparece (`getComputedStyle(el).display`).

**Por qué:** `#app-loading` tiene `display:flex`; con `hidden` seguía
encima de la app, con fondo casi negro (commit 96a497e, bitácora 2026-09).

## Una sola forma de mostrar y ocultar cada elemento

**Qué cuidar:** si un elemento se muestra con una clase (`.visible`), se
oculta sacando la clase, no con `el.style.display = 'none'`. Un estilo
inline le gana a la clase y queda puesto hasta recargar.

**Por qué:** BUG-LOGIN-001 Bug A: `forceLogout()` ocultaba `#app-screen`
con estilo inline e `initApp()` lo mostraba con `classList.add('visible')`.
Después de un `forceLogout()`, todo login posterior en esa carga quedaba
invisible; F5 lo "arreglaba". Diagnóstico: las dos pantallas con
`display` computado `none` y el `<body>` negro.

**Dónde ya está bien:** `forceLogout()` e `initApp()` usan solo la clase;
`initApp()` además limpia el inline por las dudas.

## Un modal no puede ser más alto que la pantalla sin scroll

**Qué cuidar:** al sumar contenido a un modal, probar en una pantalla
baja. `.modal` tiene `max-height` y `overflow-y:auto`; un modal nuevo que
no use esa clase tiene que tener lo mismo.

**Por qué:** la sección de Fotos dejó el encabezado del modal de plan
fuera de alcance en pantallas bajas (REQ-MEDIA-002, bitácora 2026-09).
