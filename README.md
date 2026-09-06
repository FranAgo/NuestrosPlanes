# Nuestros Planes ♡

App web privada para gestionar planes en pareja. Frontend en GitHub Pages, backend en Google Apps Script, base de datos en Google Sheets.

---

## Estructura del repositorio

```
/
├── index.html          ← Frontend completo (HTML + CSS + JS)
├── Code.gs             ← Google Apps Script (copiar manualmente)
├── skills/             ← Skills de Claude Code (personajes ingenieros)
└── README.md
```

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
4. Ejecutar `setupSheets()` una sola vez (crea las hojas con los headers correctos).
5. En la hoja `Usuarios`, dejar las columnas `usuario_id | nombre_display | email | google_sub | foto_url` y cargar a mano el **email de Google** real de cada usuario en la columna `email` (tiene que coincidir exacto). `google_sub` se completa solo en el primer login.
6. Ir a **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - Copiar la URL que genera (la vas a necesitar en el frontend).

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
- El token de sesión es `SHA-256(userId + SESSION_SECRET)`, stateless. Suficiente para dos usuarios privados.

---

## Notas operativas

- Si hacés cambios en el Apps Script, tenés que crear una **nueva implementación** (no actualizar la existente) y actualizar la `SCRIPT_URL` en el frontend.
- Para agregar o cambiar un usuario: editá la hoja `Usuarios` (columna `email`) y agregá su email como usuario de prueba en la pantalla de consentimiento de Google Cloud. No hace falta tocar código.
- El frontend no tiene build step: es un solo archivo HTML. Editalo directamente y hacé push.
