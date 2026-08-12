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

### 3. Google Apps Script

1. Ir a [script.google.com](https://script.google.com) → Nuevo proyecto.
2. Copiar el contenido de `Code.gs` en el editor.
3. Reemplazar en las primeras líneas:
   ```javascript
   const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
   const DRIVE_FOLDER_ID = 'TU_FOLDER_ID_AQUI';
   ```
4. Guardar el proyecto.
5. Ejecutar `setupSheets()` una sola vez (crea las hojas con los headers correctos).
6. Editar `setupUsuarios()` con tus datos reales:
   ```javascript
   { id: 'franco',  nombre: 'Franco',  password: 'tu_contraseña_real' },
   { id: 'novia',   nombre: 'Tu Novia', password: 'su_contraseña_real' },
   ```
7. Ejecutar `setupUsuarios()` una sola vez.
8. **Importante**: borrar las contraseñas en texto plano de `setupUsuarios()` después de ejecutarla.
9. Ir a **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - Copiar la URL que genera (la vas a necesitar en el frontend).

---

### 4. Frontend

1. En `index.html`, reemplazar:
   ```javascript
   const SCRIPT_URL = 'TU_APPS_SCRIPT_URL_AQUI';
   ```
   con la URL del Web App del paso anterior.

---

### 5. GitHub Pages

1. Crear un repositorio en GitHub (puede ser privado).
2. Subir `index.html` a la raíz del repo.
3. Ir a **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / `master`, carpeta `/ (root)`
4. GitHub Pages va a generar una URL del tipo:
   `https://tuusuario.github.io/nombre-del-repo/`

---

## Seguridad

- El Spreadsheet **no debe ser público**. Si alguien accede a él, puede ver todas las contraseñas hasheadas y todos los datos.
- La URL del Apps Script Web App es pública (necesario para que GitHub Pages pueda llamarla), pero cada endpoint valida la sesión antes de operar.
- Las contraseñas se guardan como SHA-256. Es suficiente para dos usuarios privados, pero no se recomienda para aplicaciones con usuarios externos.
- No subas el `Code.gs` con las contraseñas en texto plano si el repositorio es público.

---

## Notas operativas

- Si hacés cambios en el Apps Script, tenés que crear una **nueva implementación** (no actualizar la existente) y actualizar la `SCRIPT_URL` en el frontend.
- El frontend no tiene build step: es un solo archivo HTML. Editalo directamente y hacé push.
