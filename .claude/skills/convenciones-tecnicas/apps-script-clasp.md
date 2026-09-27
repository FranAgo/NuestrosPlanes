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

**Por qué:** BUG-CARGA-001 (2026-09-25): cargas fallidas durante días que
nadie podía ver. `docs/requerimientos/BUG-CARGA-001.md`.

## El editor de Apps Script por control remoto es frágil

**Qué cuidar:** si hace falta ejecutar una función desde el editor
(`script.google.com`) con Claude in Chrome, el selector de funciones
falla seguido y tipear puede caer adentro del código. Preferir `clasp
run`; si no se puede, pedirle a Franco esos uno o dos clics.

**Por qué:** una vez se tipeó "setupSheets" al principio de `Code.gs` y
hubo que borrarlo a mano antes del autoguardado.
