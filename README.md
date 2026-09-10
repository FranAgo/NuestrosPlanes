# Nuestros Planes ♡

App web privada para gestionar planes en pareja. Frontend en GitHub Pages, backend en Google Apps Script, base de datos en Google Sheets.

---

## Estructura del repositorio

```
/
├── index.html          ← Frontend completo (HTML + CSS + JS), lo sirve GitHub Pages
├── Code.gs             ← Backend Google Apps Script, se despliega con clasp
├── Tests.gs            ← Pruebas server-side (probarDATA002…). Solo va a test, no a prod.
├── appsscript.json     ← Manifiesto del proyecto de Apps Script (se commitea)
├── .claspignore        ← push a prod: solo Code.gs + manifiesto
├── .claspignore-test   ← push a test: además Tests.gs
├── docs/               ← Diseño del modelo de datos y requerimientos (REQ-*)
├── bitacora/           ← Registro de cambios por mes
├── skills/             ← Skills de Claude Code (personajes ingenieros)
└── README.md
```

> `.clasp.json` (prod) y `.clasp-test.json` (test) están en `.gitignore`: son
> config local de deploy, apuntan a los script IDs de cada entorno.

---

## Setup — paso a paso

### 1. Google Sheets

1. Crear un Google Spreadsheet nuevo.
2. Copiar el ID del Spreadsheet desde la URL:
   `https://docs.google.com/spreadsheets/d/**[ESTE_ES_EL_ID]**/edit`
3. El Spreadsheet debe ser de acceso **solo para vos** (no compartido con nadie más, no público).

---

### 2. Google Drive — Carpeta para fotos

1. Crear una carpeta en Google Drive llamada `couple-plans-avatars` (o el nombre que prefieras).
2. Copiar el ID de la carpeta desde la URL:
   `https://drive.google.com/drive/folders/**[ESTE_ES_EL_ID]**`

---

### 3. Google Cloud — OAuth Client ID (login con Google)

1. Ir a [console.cloud.google.com](https://console.cloud.google.com) → crear (o elegir) un proyecto.
2. **Pantalla de consentimiento OAuth** ("Google Auth Platform"): tipo **Externo**, completar nombre de la app y email de contacto. En **Público → Usuarios de prueba** agregar los emails de los dos usuarios. **Dejar la app en modo "Testing"** — no publicar a producción. Con solo permisos básicos (email, perfil) y 2 usuarios de prueba alcanza, y se evita la verificación de Google.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**
   - **Orígenes de JavaScript autorizados**: `https://franago.github.io`
   - (No hace falta URI de redirección.)
4. Copiar el **Client ID** (`...apps.googleusercontent.com`). Se usa en el backend y en el frontend — no es secreto.

---

### 4. Google Apps Script

1. Ir a [script.google.com](https://script.google.com) → Nuevo proyecto.
2. Copiar el contenido de `Code.gs` en el editor.
3. Editar `setupConfig()` con tus valores y ejecutarla **una sola vez**:
   ```javascript
   SPREADSHEET_ID:  '...'                         // ID del Spreadsheet
   DRIVE_FOLDER_ID: '...'                         // ID de la carpeta de Drive
   OAUTH_CLIENT_ID: '...apps.googleusercontent.com'
   SESSION_SECRET:  '...'                         // string aleatorio largo (40+ caracteres)
   ```
   Después borrar esos valores de la función (quedan guardados en **Project Settings → Script Properties**).
4. Ejecutar `setupSheets()` una sola vez (crea/actualiza las hojas con los headers correctos). Es idempotente: se puede volver a correr sin romper nada.
5. En la hoja `Usuarios`, cargar a mano el **email de Google** real de cada usuario en la columna `email` (tiene que coincidir exacto). `google_sub` se completa solo en el primer login.
6. Ir a **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - Copiar la URL que genera (la vas a necesitar en el frontend).

A partir de acá, los cambios de backend NO se pegan a mano: se despliegan con
`clasp` (ver [Deploy del backend](#deploy-del-backend-apps-script--clasp)).

---

### 5. Frontend

1. En `index.html`, reemplazar:
   ```javascript
   const SCRIPT_URL = 'TU_APPS_SCRIPT_URL_AQUI';
   const GOOGLE_CLIENT_ID = 'REEMPLAZAR.apps.googleusercontent.com';
   ```
   con la URL del Web App y el Client ID de los pasos anteriores.

---

### 6. GitHub Pages

1. Crear un repositorio en GitHub (puede ser privado).
2. Subir `index.html` a la raíz del repo.
3. Ir a **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / `master`, carpeta `/ (root)`
4. GitHub Pages va a generar una URL del tipo:
   `https://tuusuario.github.io/nombre-del-repo/`

---

## Seguridad

- **No hay contraseñas.** El login es con Google Sign-In. El backend verifica el ID token contra Google y solo deja entrar a los emails cargados en la hoja `Usuarios` (lista blanca).
- Toda la configuración sensible (`SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `OAUTH_CLIENT_ID`, `SESSION_SECRET`) vive en **Script Properties**, no en el código. `Code.gs` se puede subir a un repo público sin riesgo.
- El `GOOGLE_CLIENT_ID` en `index.html` **no es secreto**: los Client ID de OAuth están pensados para vivir en el frontend. Lo que lo protege son los orígenes autorizados en Google Cloud.
- El Spreadsheet **no debe ser público**: contiene los datos (planes, emails). Ya no contiene contraseñas.
- La URL del Apps Script Web App es pública (necesario para que GitHub Pages pueda llamarla), pero cada endpoint valida la sesión antes de operar.
- El token de sesión es opaco (`<session_id>.<secreto>`), con estado en la hoja `Sesiones`: expiración absoluta de 15 días y revocable (logout). La hoja guarda `HMAC-SHA256(secreto, SESSION_SECRET)`, nunca el secreto. Ver `docs/requerimientos/REQ-SEC-001.md`.
- Accesos y cambios sensibles (login, login denegado, logout, borrado de categorías/planes) quedan registrados en la hoja `Auditoria` — la app maneja datos personales (Ley 25.326). Ver `docs/requerimientos/REQ-DATA-002.md`.

---

## Deploy del backend (Apps Script) — clasp

`clasp` ya está instalado y logueado en la máquina de trabajo. El código vive
en el repo (`Code.gs` + `appsscript.json`); `clasp push` lo sube al proyecto de
Apps Script y `clasp redeploy` actualiza la implementación existente **a una
versión nueva, manteniendo la misma URL** (equivale a *Implementar → Editar
implementación → Versión nueva* en la consola). Ya **no** se crea una
implementación nueva por cada cambio.

### Entornos

| Entorno | Config local | Script ID | Para qué |
|---|---|---|---|
| prod | `.clasp.json` | `1Hd1LPR…Oc18d` | la app real, la que usa el frontend |
| test | `.clasp-test.json` | `1yV7KZe…QJjt` | pruebas de Duck antes de promover a prod |

`clasp` usa `.clasp.json` por defecto; para el entorno de test se pasa
`-P .clasp-test.json` en cada comando.

### Flujo a producción

```bash
clasp push -f                                 # sube Code.gs + appsscript.json
clasp version "REQ-XXX: descripción corta"     # crea una versión inmutable
clasp deployments                              # ver el deploymentId del Web App y el nº de versión
clasp redeploy <deploymentId> -V <n> -d "REQ-XXX: descripción"
```

El `deploymentId` del Web App que consume el frontend es el que aparece en
`clasp deployments` con una descripción (no el `@HEAD`). La URL del Web App
**no cambia** con `redeploy`, así que no hay que tocar `SCRIPT_URL` en el
frontend.

**Rollback:** el mismo `clasp redeploy <deploymentId> -V <versión anterior>`.

### Flujo a test (para Duck / Claude)

```bash
clasp push -f -P .clasp-test.json -I .claspignore-test      # sube Code.gs + Tests.gs al proyecto de test
clasp run probarDATA002 -P .clasp-test.json                 # corre las pruebas server-side, devuelve JSON
```

`probarDATA002()` (en `Tests.gs`) crea su **propia planilla scratch**, corre
`setupSheets()` / `backfillAuditoriaCategoriasPlanes()` / los endpoints contra
Sheets real, verifica los 16 criterios de REQ-DATA-002 y borra la planilla al
terminar. No toca ni la planilla de prod ni la de test. Devuelve
`{ req, total, ok, fail, veredicto, detalles, notas }`.

Requisitos una sola vez para que `clasp run` funcione:
1. Activar la **Apps Script API**: [script.google.com/home/usersettings](https://script.google.com/home/usersettings).
2. `clasp login` (para que el token tenga el scope `script.projects`).

Para promover a prod, seguir el flujo de producción de arriba (Tests.gs no se
sube: `.claspignore` de prod es una allowlist de `Code.gs` + `appsscript.json`).

---

## Notas operativas

- Para agregar o cambiar un usuario: editá la hoja `Usuarios` (columna `email`) y agregá su email como usuario de prueba en la pantalla de consentimiento de Google Cloud. No hace falta tocar código.
- El frontend no tiene build step: es un solo archivo HTML. Editalo directamente y hacé push (lo sirve GitHub Pages).
