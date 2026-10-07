# Inventario de infraestructura — Nuestros Planes

Qué piezas tiene la app, dónde vive cada una, cómo se publica y se vuelve
atrás, quién puede hacerlo y qué puede vencer. Datos del proyecto que
leen y actualizan `hroy-estado-infra` (revisión) y `hroy-deploy` (cuando
un deploy cambia algo de lo que figura acá). Los cuidados aprendidos a
los golpes están en `convenciones-tecnicas` (`infraestructura.md` y
`apps-script-clasp.md`); los comandos completos, en `README.md`.

El repo es público: acá no van IDs de planillas ni carpetas, ni valores
de Script Properties. Los IDs de script e implementaciones van recortados
por prolijidad (mismo criterio que `README.md`), aunque el del Web App de
prod ya es público en `SCRIPT_URL` de `index.html` y no es un secreto: el
acceso lo decide la sesión en `Code.gs`.

Contenido: 1. Piezas · 2. Configuración y secretos · 3. Tareas
programadas · 4. Respaldo · 5. CI · 6. Vencimientos · 7. Costo, cuotas y
alertas · 8. Última lectura.

## 1. Piezas

| Pieza | Dónde vive | Cómo se publica | Vuelta atrás | Quién |
|---|---|---|---|---|
| Front (`index.html`, `privacidad.html`; Pages sirve también `docs/` y `bitacora/`) | GitHub Pages del repo `FranAgo/NuestrosPlanes` (público), rama `main`, raíz | `git push origin main` dispara "pages build and deployment" (Actions de GitHub) | `git revert` + push; las pestañas abiertas siguen con la versión vieja hasta recargar | Franco (cuenta FranAgo) |
| Servidor prod (`Code.gs` + `appsscript.json`) | Apps Script, script `1Hd1LPR…Oc18d` (`.clasp.json`) | `clasp push -f`, `clasp run setupSheets` si hay columnas nuevas, `clasp version "<hash> …"`, `clasp redeploy <id del Web App> -V <n>` | `clasp redeploy <id> -V <versión anterior>` y `clasp push` del commit anterior (si no, `@HEAD` y `clasp run` siguen con el código nuevo); no deshace datos escritos ni columnas agregadas por `setupSheets()` | Franco o Claude con su OK, perfil de clasp de la PC |
| Servidor test (`Code.gs` + `Tests.gs`) | Apps Script, script `1yV7KZe…QJjt` (`.clasp-test.json`) | `clasp push -f -P .clasp-test.json -I .claspignore-test`; para el Web App de test, además `version` + `redeploy` de su implementación | Volver a pushear el commit anterior | Cualquiera (sin datos reales) |
| Datos prod | Una planilla de Google Sheets (hojas `Usuarios`, `Categorias`, `Planes`, `Archivos`, `Sesiones`, `Auditoria`, `Config`) | Solo la escribe `Code.gs`; columnas nuevas con `setupSheets()` | Historial de versiones de Sheets (ver §4) | — |
| Fotos prod | Carpeta raíz de Drive (`DRIVE_FOLDER_ID`), una carpeta por tarea | `Code.gs` (`DriveApp`) | Papelera de Drive (30 días) | — |
| Datos y fotos de test | Planilla y carpeta propias del proyecto de test; los `probarXXX()` crean y borran planillas scratch | — | — | — |
| Login | Cliente OAuth de Google Identity Services en el proyecto de Cloud `nuestrosplanes-507721`; usuarios de prueba en la pantalla de consentimiento | Consola de Google Cloud | Consola | Franco |
| Logs | Cloud Logging del mismo proyecto de Cloud (prod y test mezclados) | — | — | — |

Implementaciones de Apps Script (leídas con `clasp deployments`):

| Proyecto | Implementación | Para qué |
|---|---|---|
| prod | `AKfycbyKWCtppz…LxD0d` | Web App que usa el front (`SCRIPT_URL` en `index.html`). Siempre `redeploy` sobre esta: una nueva cambia la URL |
| prod | `AKfycby0ZA5q…HAMR` @16 | Implementación vieja sin descripción. Probablemente la API Executable para `clasp run`; sin confirmar (BL-041) |
| prod | `@HEAD` | La que usa `clasp run` (corre el código subido, no la versión publicada) |
| test | `AKfycbw5O9…8o7gZ` @11 (2026-10-07, REQ-MEDIA-008) | Web App de test (simulaciones con dos sesiones, `simPLAN001_preparar`; mediciones de subida, `medirBL045_*`) |
| test | `@5 "clasp run — Duck QA"`, `@4 "BUG-LOGIN-001-B"`, `@HEAD` | `clasp run` y pruebas viejas |

## 2. Configuración y secretos

- **Script Properties** (por proyecto, prod y test por separado):
  `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `OAUTH_CLIENT_ID`,
  `SESSION_SECRET`, `AUDIT_PSEUDONYM_KEY` (se crea sola). En test además
  `TEST_RUNNER_KEY` (habilita `doGet`); en prod no tiene que existir.
- **Manifiesto** (`appsscript.json`): runtime V8, zona
  `America/Argentina/Buenos_Aires`, Web App `USER_DEPLOYING` +
  `ANYONE_ANONYMOUS`, Execution API `MYSELF`, scopes `spreadsheets`,
  `drive`, `script.external_request`, `script.scriptapp`.
- **Fuera del repo** (`.gitignore`, literal): `config-local-NO-SUBIR.md`,
  `.claude/settings.local.json`, `.clasp.json`, `.clasp-test.json`,
  `.clasp-prod.json`, `client_secret*.json`, `.clasprc.json`. Ninguno
  entró nunca al historial (`git log --all`, 2026-10-06).
- **Credenciales de clasp**: perfil por defecto (push, deploy, `clasp
  logs`) y perfil `duck` (`clasp run`). Ver `apps-script-clasp.md`.

## 3. Tareas programadas

| Tarea | Proyecto | Frecuencia | Cómo se verifica |
|---|---|---|---|
| `purgarSesiones` | prod | Semanal, por tiempo (según el comentario de `listarTriggers` en `Code.gs`) | `clasp run listarTriggers -u duck` (solo lectura) |

## 4. Respaldo

Qué hay que poder recuperar: planes, categorías, la relación con las fotos
(`Archivos`) y las fotos. `Sesiones` y `Auditoria` no son críticas para
recuperar (DEC pendiente con BL-006, retención).

| Qué | Respaldo | Retención | Restauración probada |
|---|---|---|---|
| Planilla prod | Copia diaria (`respaldoDiario`, trigger 04:00) a la carpeta `Respaldos <nombre de la planilla>` de la Drive de Franco, sin la hoja `Sesiones` (REQ-DATA-003). Además, el historial de versiones de Sheets | 7 diarias, 4 semanales, 12 mensuales y una por año sin tope; las que salen van a la papelera (30 días) | Sí, en `probarDATA003` (copia de la copia + `setupSheets`, 2026-10-07) |
| Fotos (Drive) | Papelera de Drive (la app nunca borra archivos de Drive) + copia física cada dos semanas con Takeout | 30 días en papelera; la copia física, lo que Franco guarde | La copia física: se mira que el ZIP abra |
| Planilla y fotos fuera de la cuenta | Copia física cada dos semanas (abajo) | — | — |

**Si el respaldo diario falla**, Google le manda a Franco el mail de fallas
del trigger. Para mirar el estado: `clasp run estadoRespaldos -u duck`
(solo lectura: nombres de las copias y filas por hoja de la última y del
original). En la revisión trimestral: `listarTriggers` muestra
`respaldoDiario` y la última copia es de ayer o de hoy.

**Restaurar la planilla** (con OK de Franco, es prod):
1. En la carpeta de respaldos, elegir la copia y hacerle una copia
   ("Hacer una copia"). Nunca se usa la copia de respaldo misma: así sigue
   intacta.
2. Poner el ID de esa copia nueva en la Script Property `SPREADSHEET_ID`
   del proyecto de prod.
3. `clasp run setupSheets -u duck`: vuelve a crear `Sesiones` vacía. Las dos
   personas tienen que volver a entrar.
4. Abrir la app y ver las tareas. Anotar en la bitácora qué copia se usó.

**Copia física cada dos semanas** (Franco, a mano, unos 5 minutos):
1. takeout.google.com → "Anular la selección" → marcar solo Drive → en
   "Todos los datos de Drive incluidos", elegir la carpeta de fotos de la
   app y la planilla de datos.
2. Exportar una vez, .zip. Google manda un mail cuando está lista (puede
   tardar horas).
3. Bajar el ZIP a un disco de Franco (no un pendrive suelto: tiene todas las
   fotos y datos personales) y ver que abra. Borrar la copia física de hace
   más de un par de meses si no hace falta guardarla.

Takeout solo programa exportaciones cada 2 meses; por eso es a mano.

## 5. CI

- Única corrida: "pages build and deployment", la que GitHub arma para
  Pages. No corre `check-sintaxis.js` ni pruebas: eso lo hace el hook
  `pre-commit` en cada PC (`.githooks/pre-commit`).
- Quién se entera de un rojo: nadie, salvo mirando Actions o la versión
  servida (`verificacion-navegador.md` §9).
- Riesgo conocido: un incidente de runners de GitHub deja el deploy de
  Pages en cola sin publicar (2026-10-05, corrida #86, bitácora).

## 6. Vencimientos

| Qué | Fecha | Fuente | Qué pasa | Estado |
|---|---|---|---|---|
| Runtime Rhino de Apps Script | 2026-01-31 | [Migrate scripts to the V8 runtime](https://developers.google.com/apps-script/guides/v8-runtime/migration) | Los scripts en Rhino dejan de correr | No aplica: el manifiesto ya dice V8 |
| Token del perfil `duck` de clasp | Sin fecha conocida | `apps-script-clasp.md` (ya dio `invalid_grant`) | `clasp run` falla hasta renovar con `clasp login --user duck …` | Se renueva cuando falla |
| Dominio y certificado | — | `franago.github.io`, los maneja GitHub | — | No aplica |

## 7. Costo, cuotas y alertas

- Costo: cero (GitHub Pages gratis, Apps Script y Sheets en cuenta
  personal de Google).
- Cuotas de Apps Script de cuenta personal (tiempo por ejecución, tiempo
  de triggers por día): sin medir; el piso de un pedido al Web App está
  medido en `apps-script-clasp.md` (1,5 a 4,5 s).
- Alertas: ninguna. Los errores del servidor quedan en Cloud Logging con
  `doPost [E-XXXXXX]` y solo se ven si alguien los busca.

## 8. Última lectura

Leído: 2026-10-06, `hroy-estado-infra` (primera pasada), clasp 3.3.0,
API pública de GitHub con `curl`.

| Pieza | Resultado |
|---|---|
| Front | Igual al repo: lo servido por Pages (sin caché) tiene el mismo SHA-1 que `index.html` en `HEAD` (`aef0319`), `APP_VERSION` 1.8.1. `Cache-Control: max-age=600` |
| Servidor prod | `Code.gs` y `appsscript.json` de `@HEAD` del proyecto (bajados con `clasp pull` a una carpeta aparte) iguales al repo. El Web App apunta a la versión 35 ("v1.8.1"); que la 35 sea ese mismo código sale de la bitácora del 2026-10-05, no de una lectura |
| Servidor test | Implementaciones listadas; el código no se comparó. No se sabe si la planilla de test tiene hoy la misma forma que la de prod |
| Tareas programadas | No leído: `listarTriggers` contra prod necesita `clasp run` con el OK de Franco (BL-041) |
| CI | Última corrida (`aef0319`, 2026-10-06) en verde. La #86 (`09789dd`) sigue en cola desde el incidente del 2026-10-05; no afecta lo publicado |
| Implementación @16 de prod | Sin confirmar para qué es (BL-041) |
