# Apps Script y clasp: deploy, pruebas y logs

El flujo completo de comandos está en `README.md` ("Deploy del backend").
Acá, solo lo que ya salió mal alguna vez.

## `clasp push` sube el árbol de trabajo entero, no "el cambio"

**Qué cuidar:** `clasp push` sube `Code.gs` tal como está en disco, con
todo lo que tenga, aunque sean commits de otro REQ que todavía no se
aprobó para prod. Antes de un push a prod, confirmar que el working tree
contiene solo lo que se quiere deployar (`git status`, `git log` desde el
último deploy). Para saber qué hay realmente en prod: `clasp pull` a una
carpeta aparte (nunca sobre el repo) y comparar.

**Por qué:** el push del deploy de BUG-LOGIN-001 (v15) llevó a prod el
código de REQ-DATA-002 que estaba por debajo en `main`, sin que nadie lo
decidiera. Se descubrió recién en la sesión siguiente, bajando el
`Code.gs` de prod (bitácora 2026-09, deploy de REQ-DATA-002).

**Además:** un cambio de esquema no termina con el push. Si el código
nuevo espera columnas u hojas nuevas, hay que correr `setupSheets()` (y
los backfill que correspondan) contra la planilla de ese ambiente.
`clasp run setupSheets` ejecuta el código **subido** al proyecto (HEAD),
no la versión desplegada: primero `clasp push`, después `setupSheets`,
y recién después `version` + `redeploy`. Hacer el push sin `redeploy` no
cambia lo que usa la app. (REQ-PLAN-001, 2026-09-28: el código de prod
todavía era el de v24 y `setupSheets` no habría agregado nada.)

## Deploy a prod: `clasp …` suelto, uno por llamada

**Qué cuidar:** `clasp push -f`, `clasp version "…"`, `clasp redeploy …`
y `clasp deployments`, cada uno en su propia llamada, escritos así: sin
`npx`, sin `cd`, `;`, `&&` ni `|`. clasp está instalado global y el
directorio de trabajo ya es el repo. Para mirar algo antes (`.claspignore`,
`git status`), otra llamada.

**Por qué:** las reglas de `.claude/settings.local.json` son
`Bash(clasp:*)` y parecidas. Un comando encadenado o con `npx` no coincide
y el modo automático lo bloquea como deploy a prod, aunque Franco ya haya
dado el OK. Pasó el 2026-09-27 (deploy de BUG-FECHA-001: el encadenado
quedó bloqueado, los tres sueltos pasaron) y otra vez el 2026-10-02
(REQ-MEDIA-006).

## Prod y test: allowlist y `redeploy`

- `.claspignore` (prod) es una allowlist: solo `Code.gs` y
  `appsscript.json`. `Tests.gs` va solo a test, con
  `-P .clasp-test.json -I .claspignore-test`.
- Se actualiza siempre la implementación existente (`clasp redeploy
  <deploymentId> -V <n>`), nunca una nueva: una implementación nueva
  cambia la URL y rompe `SCRIPT_URL` del front.
- Rollback: el mismo `redeploy` con la versión anterior.

## `clasp run` necesita `-u duck`

**Qué cuidar:** `clasp run <funcion> -P .clasp-test.json -u duck`. Con el
perfil por defecto falla con "Unable to run script function... permission".
Si da `invalid_grant`, el token venció: renovar con `clasp login --user
duck --creds client_secret.json --use-project-scopes` (en segundo plano) y
pasarle la URL a Franco.

**Por qué:** la Execution API pide un proyecto de GCP estándar vinculado,
`projectId` en el `.clasp*.json`, `executionApi` y `oauthScopes` en
`appsscript.json`, una implementación API Executable y credenciales OAuth
propias. Ese armado se hizo una vez (bitácora 2026-09, "clasp run —
diagnóstico y fix"); el perfil `duck` es el que lo tiene.

## Un "Completada" en Ejecuciones no prueba que anduvo

**Qué cuidar:**
- `Logger.log` no aparece en el panel de Ejecuciones; `console.*` sí.
  Todo log que tenga que verse va con `console.error`/`console.log`.
- `doPost` atrapa las excepciones y responde 500, así que la ejecución
  figura "Completada" aunque haya fallado. Para diagnosticar, buscar
  `doPost [E-XXXXXX]` (el código que devuelve el 500 y muestra el front).
- El panel se abre con `?authuser=agoglia.franco@gmail.com`; sin eso abre
  la cuenta de la empresa y dice que no se puede abrir.
- Más rápido que el panel: `clasp logs --json` con el perfil **por
  defecto** (con `-u duck` da "Insufficient Permission"). Trae las 100
  entradas más recientes de Cloud Logging, **incluidas las de
  `Logger.log`**, de prod y test mezclados (comparten el proyecto de
  Cloud). Para separarlos: `invocation_type` "web app" es uso real; "apps
  script api" es `clasp run` (tests).

**Por qué:** BUG-CARGA-001 (2026-09-25): cargas fallidas durante días que
nadie podía ver. El 2026-09-27, `clasp logs` mostró la causa (errores de
permisos del 20 al 25/09) que el panel de Ejecuciones nunca había
mostrado. `docs/requerimientos/BUG-CARGA-001.md`.

## El editor de Apps Script por control remoto es frágil

**Qué cuidar:** si hace falta ejecutar una función desde el editor
(`script.google.com`) con Claude in Chrome, el selector de funciones
falla seguido y tipear puede caer adentro del código. Preferir `clasp
run`; si no se puede, pedirle a Franco esos uno o dos clics.

**Por qué:** una vez se tipeó "setupSheets" al principio de `Code.gs` y
hubo que borrarlo a mano antes del autoguardado.

## `clasp logs` mezcla prod y test: separar por `deployment_id`

**Qué cuidar:** los dos proyectos de Apps Script comparten el proyecto de
Google Cloud, así que `clasp logs --json` (aunque se corra con `.clasp.json`
de prod) trae también las ejecuciones de test. Antes de sacar una
conclusión de un log, mirar `labels."script.googleapis.com/deployment_id"`
y compararlo con `clasp deployments` (prod) y `clasp deployments -P
.clasp-test.json` (test). `invocation_type: "web app"` no alcanza: el Web
App de test también es "web app". Además trae solo las últimas ~100
entradas: que no aparezca un error no prueba que no pasó.

**Otros dos límites vistos:** `clasp run` de un handler (`handleGetX`)
devuelve "No response" porque un `TextOutput` no se serializa; y `curl -L`
contra el Web App da 411 porque el redirect pierde el cuerpo del POST. Para
un smoke sin sesión, un `fetch(SCRIPT_URL, {method:'POST', body})` desde
una pestaña de la app.

**Por qué:** BL-030 (2026-09-28): los "Error al leer archivo" con
`fake-drive-id-sim-plan001` parecían de prod y eran del Web App de test
(`...Dlhi_AngmCxwp...`, simulación de PLAN-001).

## Antes de optimizar un endpoint lento, medir el piso de la plataforma

**Qué cuidar:** un pedido al Web App que no hace nada ya tarda 1,5 a 4,5 s
(mediana ~2,2 s). Para medirlo: un POST sin sesión, que responde 401 sin
leer hojas, desde node con `redirect: 'manual'` y después un GET al
`location` (así se separan la ejecución y el redirect). Lo que haga el
handler se mide adentro, con `Date.now()` por etapa, en una función de
`Tests.gs` contra una planilla scratch (`medirBL032` es el molde). Si el
handler se lleva menos de la mitad, achicarlo no cambia la sensación:
hay que evitar el viaje (caché en el front, pedirlo antes o sumarlo a
otra respuesta).

**Por qué:** BL-032 (2026-09-28): `getFotosPlan` tardaba ~4 s y el
handler se llevaba 0,4 a 1,2 s de eso.

**Con curl, lo mismo:** `curl -L -X POST` contra el Web App devuelve un
411 de Google ("POST requests require a Content-length"), no la
respuesta de la app: al seguir el redirect repite el POST sin cuerpo.
Sacar el `location` con `curl -s -o /dev/null -w "%{redirect_url}" -X
POST --data '…'` y después un `curl -s` (GET) a esa URL. (Smoke de prod
de 1.8.1, 2026-10-05.)
