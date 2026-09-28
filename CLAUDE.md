# Peroncitos — instrucciones del proyecto

## Flujo de trabajo con Claude Code

### Subida a GitHub (commit + push)
- **Solo al terminar la sesión de trabajo** y **después de una confirmación clara del usuario** (por ejemplo: "listo, subí todo" / "confirmá el push").
- Nunca hacer commit ni push automáticamente durante la sesión ni sin ese "sí" explícito.
- Rama: `main` (push directo a `origin/main`), salvo que el usuario pida otra cosa.
- Antes de pushear: actualizar la bitácora (ver abajo) e incluirla en el mismo commit.

### Bitácora de cambios
Registrar todo cambio hecho en la sesión en:

```
bitacora/<AÑO>/<MES>-<nombre-mes>.txt
```

- Si no existe la carpeta del año en que se hace el cambio, crearla.
- Si no existe el archivo del mes, crearlo (ej: `bitacora/2026/09-septiembre.txt`).
- Las entradas se agregan al final del archivo del mes, más reciente abajo.

Cada entrada debe incluir:
- **Fecha y hora en hora Argentina (UTC-3)** — calcular con la zona `Argentina Standard Time`, no usar la hora del sistema si difiere.
- **Autor**: quién pidió/hizo el cambio (nombre y, si se conoce, email).
- **Herramienta**: "Claude Code (<modelo>)", con el modelo que corrió en esa sesión (Franco lo va cambiando; ej. "Claude Code (Opus 5.5)", "Claude Code (Sonnet 5)"). Si en la misma sesión se usaron dos, se anotan los dos.
- **Lista de cambios**: archivos tocados y una descripción breve de qué se hizo.

Formato de cada entrada:

```
========================================================
2026-09-05 17:55 (hora Argentina, UTC-3)
Autor: Franco Agoglia <Gestion@sisintegrales.com>
Herramienta: Claude Code (Opus 5.5)
--------------------------------------------------------
Cambios:
- ruta/al/archivo.ext — qué se cambió y por qué
- otra/ruta.ext — ...
========================================================
```

- Hora: el reloj de Windows de esta máquina ya está en hora Argentina. En Git Bash, `date` sin nada anda bien; `TZ=... date` NO (no hay tzdata y devuelve UTC sin avisar). Ante la duda, `Get-Date` en PowerShell.

### Deploy a producción — siempre con aprobación explícita
- Cada paso que toca producción (`clasp push`/`redeploy` al proyecto de prod, `git push` a `main` que publica GitHub Pages, cambios en Google Cloud) se pregunta justo antes y espera un sí explícito. Un OK anterior, o "hacé todo el flujo", no alcanza.
- Antes de pedir el OK: `node check-sintaxis.js` en verde, las pruebas `probarXXX()` que correspondan en verde contra el proyecto de **test**, y un resumen corto de qué va a subir.
- Si la respuesta es ambigua ("dale" después de un mensaje con varios temas), preguntar puntualmente qué se aprueba.
- Cuidados de clasp (qué sube un `push`, `-u duck`, logs de Ejecuciones): skill `convenciones-tecnicas`, tema `apps-script-clasp.md`.

## Contexto del producto y registros

- La app se llama **Nuestros Planes** (Peroncitos es solo el nombre del repo). Es privada, para dos personas (Franco y Noelia): planes en pareja, categorías y fotos. Datos personales bajo la Ley 25.326 (emails, fotos, auditoría de accesos).
- Stack: `index.html` único (HTML + CSS + JS, sin build) en GitHub Pages; backend `Code.gs` en Apps Script (Web App) con proyectos de **prod** y **test**; datos en Google Sheets; fotos en Drive. Detalle en `README.md` y `docs/modelo-datos.md`.
- Requerimientos formales: `docs/requerimientos/REQ-XXX.md` (y `BUG-XXX.md`). Un hallazgo sobre un REQ que ya existe se escribe en ese REQ en la misma sesión, no solo en el backlog o la bitácora.
- Backlog de ideas sin formalizar: `docs/backlog.md` (skill `hpaul-triage`).
- Registro de decisiones en formato ADR: `docs/decisiones.md` (skill `hpaul-decision-log`).
- Mejora de los skills del equipo: `docs/skills/METODOLOGIA.md` (proceso) y `docs/skills/INVENTARIO.md` (estado de cada skill).
- Las skills de `.claude/skills/` no guardan datos del proyecto: son procedimientos. Los datos van en `docs/` (DEC-001).
- Al retomar ("¿cómo seguimos?", "¿qué quedó pendiente?"): `git status` y commits recientes, estado de cada REQ, `docs/backlog.md` completo y, si hace falta, la bitácora del mes.

## Arquitectura y trampas conocidas

- `index.html` usa un `<script>` clásico, sin módulos ni `"use strict"`: un nombre sin declarar no tira error de sintaxis. `node check-sintaxis.js` valida la sintaxis de `index.html`, `Code.gs` y `Tests.gs` sin ejecutarlos; que pase no dice que la lógica esté bien.
- Las pruebas del servidor son funciones `probarXXX()` en `Tests.gs`, que solo se sube al proyecto de test y corre con `clasp run ... -P .clasp-test.json -u duck` contra una planilla scratch propia. Nunca contra prod.
- El preview local (`localhost:5173`) pega al Apps Script de **producción**: cualquier escritura con sesión real toca los datos reales. Ver `convenciones-tecnicas`, tema `verificacion-navegador.md`.
- Todo control de acceso real vive en `Code.gs` (no hay reglas de base): lo que el front oculta es cosmético.
- El resto de los cuidados aprendidos a los golpes está en la skill `convenciones-tecnicas`, un archivo por tema.

## Nivel de control según el tamaño del cambio

Acordado con Franco el 2026-09-27 (DEC-002, traído de sis-web). La decisión de en cuál cae cada tarea la tomo yo al arrancarla; si dudo entre los dos, pregunto en vez de asumir.

**Cambio de fondo** (proceso completo): feature o REQ nuevo, cambio de sesión/login/permisos o cualquier cosa con impacto de seguridad, cambio del modelo de datos (hojas, columnas), algo que toca `index.html` y `Code.gs` a la vez o varias pantallas, y todo deploy a producción.

**Ajuste puntual** (proceso liviano): fix acotado de un bug concreto, cambio visual o de texto, ajuste de un valor o de un caso borde, algo que se explica en una o dos frases y no cambia contratos entre front y servidor.
- Roll-call liviano: una línea por rol relevante con su aporte concreto (ej. "Jay: cambio solo de CSS. Duck: probado a 375 y 1366, consola limpia."), sin saludos.
- Verificación liviana: `node check-sintaxis.js` y las pruebas relacionadas; navegador solo si es visual o interactivo y no se puede confirmar de otra forma.
- Si en el medio aparece algo de fondo (toca sesión, cambia un endpoint, etc.), escalar al proceso completo antes de seguir.

## Equipo de ingenieros (Agent Skills)

Los 7 ingenieros (Paul, Bob, Jay, Roy, Duck, Julia, Gary) están en `.claude/skills/`, cada uno con su `SKILL.md`. Cuando habla uno, su intervención va encabezada con su nombre ("**Paul:** ..."). Las herramientas (`hpaul-*`, `hjay-*`, `hjulia-*`, `convenciones-tecnicas`) no llevan nombre: no son personas.

En un **cambio de fondo**:
- **Paul organiza primero**: alcance, orden y criterios de aceptación, antes de que nadie toque código.
- Cada ingeniero involucrado da un aporte real desde su rol, no un saludo vacío: Bob señala qué contratos (endpoints, firmas, hojas) no se pueden romper; Jay implementa o da criterio de UX; Roy marca implicancias de deploy (prod/test, clasp); Julia revisa la superficie de seguridad (`hjulia-revision-cambio`); Gary confirma impacto (o no) en las hojas.
- **Duck revisa después de cada paso importante y siempre antes de cerrar**, con evidencia propia (pruebas corridas, código leído), no repitiendo lo que dijo otro.
- Si Duck encuentra algo o propone un cambio, el ingeniero autor opina antes de aplicarlo (¿de acuerdo? ¿falso positivo? ¿mejor de otra forma?) y Paul decide.
- Los subagentes solo se usan para búsquedas de solo lectura en 3 o más lugares, verificables en menos de un minuto. Nunca para implementar, decidir ni aprobar.

Herramientas que se aplican aunque no se invoque a nadie:
- `hjay-identidad-visual` (criterio de diseño de Franco) en cualquier cambio que se vea, aunque sea chico. Nuestros Planes no usa emojis como iconos: la regla "SVG, no glifos" aplica (pendiente: BL-004).
- `hjay-verificacion-visual` antes de dar por hecho un cambio visual o interactivo.
- `convenciones-tecnicas`: antes de implementar, mirar si la tarea toca uno de sus temas y leer solo ese archivo.

## Checklist de cierre de sesión

Antes de dar por cerrada una sesión de trabajo sobre el repo, en este orden:
1. Backlog: repasar la conversación y anotar lo que se postergó y no quedó registrado (`hpaul-triage`). Hallazgos sobre un REQ existente, a su `REQ-XXX.md`.
2. Decisiones: registrar las que tuvieron opciones reales (`hpaul-decision-log`).
3. `convenciones-tecnicas`: sumar cualquier cuidado reutilizable que se haya aprendido.
4. Bitácora del mes (ver arriba).
5. Proponer commit y, con el OK explícito, `git push origin main`.
