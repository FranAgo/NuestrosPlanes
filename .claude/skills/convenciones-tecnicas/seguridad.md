# Seguridad: lo propio de Nuestros Planes

El procedimiento general está en `hjulia-revision-cambio`. Acá, solo lo
que ese procedimiento necesita saber de este proyecto. El diseño de cada
control está en `docs/requerimientos/REQ-SEC-*.md` y `README.md`
("Seguridad").

Contenido: 1. Qué capa decide · 2. Cuentas · 3. Sesión · 4. Datos en el
HTML · 5. Archivos de Drive · 6. Auditoría y datos personales · 7. Tests.

## 1. Qué capa decide

No hay reglas de base de datos: la planilla no es accesible para el
cliente. **Todo control real vive en `Code.gs`**, en el handler de cada
acción de `doPost`. Lo que el front oculta o deshabilita es cosmético.
Un endpoint nuevo valida la sesión (`validarSesion`) antes de leer o
escribir nada; revisar leer/crear/modificar/borrar por separado.

## 2. Cuentas

- Lista blanca: la hoja `Usuarios` (columna `email`). Solo entra un email
  verificado por Google que esté ahí; el resto queda en `Auditoria` como
  `login_denegado`, con el email enmascarado (`enmascararEmail`).
- El login verifica el access token contra `tokeninfo` de Google en el
  servidor (`handleLoginGoogle`); el front no decide nada.
- Hay dos usuarios y ningún rol distinto hoy. Si aparece un rol admin
  (BL-003), la matriz de `hjulia-revision-cambio` pasa a tener filas
  reales.

## 3. Sesión

- Token opaco `<session_id>.<secreto>`; la hoja `Sesiones` guarda
  `HMAC-SHA256(secreto, SESSION_SECRET)`, nunca el secreto. Comparación
  en tiempo constante. Expiración absoluta de 15 días, revocable.
- El puente anti-carrera de `CacheService` (`validarDesdePuente`) guarda
  el hash, no el token, y solo se consulta si la hoja respondió "no
  está", nunca si falló. El logout lo borra siempre. Ver
  `sheets-concurrencia.md`.
- Secretos y IDs (`SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `SESSION_SECRET`)
  viven en Script Properties, nunca en el código ni en el front.
  `GOOGLE_CLIENT_ID` en `index.html` no es secreto.

## 4. Datos en el HTML

Todo dato de la planilla que termina en `innerHTML` pasa por el helper
de su contexto (`index.html`, al final del script):
- texto y atributos entre comillas dobles: `escapeHtml` (no escapa `'`:
  no usarlo en atributos con comillas simples ni dentro de un `onclick`);
- ids dentro de `onclick="f('...')"`: `safeId` (solo `[A-Za-z0-9_-]`);
- colores en `style=`: `safeColor` (solo `#hex`);
- URLs de imagen: el helper que acepta solo `https?:` o `data:image/`.

Revisado el 2026-09-27: todos los usos actuales respetan su contexto.

## 5. Archivos de Drive

Las fotos nunca se sirven con URL pública ni con una URL de Google en el
cliente: pasan por `getArchivo`/`getArchivos` con sesión y vuelven como
data URL. Una miniatura de Drive (BL-011) se baja en el servidor, no se
expone su `thumbnailLink`.

## 6. Auditoría y datos personales

- `registrarAuditoria()` guarda quién hizo qué (login, login denegado,
  logout, borrados) atado al usuario de la sesión validada, y descarta
  claves de `detalle` que no estén en la lista permitida.
- Los mensajes de error y los logs (`console.error` en `doPost`) no
  llevan tokens, emails ni IDs de planilla o de Drive (BUG-CARGA-001).
- Ley 25.326: datos personales de dos personas (emails, fotos, planes).
  Pendientes conocidos: BL-005 (dominio del email en Auditoría) y BL-006
  (retención de Auditoría).

## 7. Tests

Los tests de seguridad son funciones `probarXXX()` en `Tests.gs`, que
corren contra Apps Script real en el proyecto de **test**, con una
planilla scratch propia que se borra al final:

```bash
clasp push -f -P .clasp-test.json -I .claspignore-test
clasp run probarBUGLOGIN001B -P .clasp-test.json -u duck
```

"Probá que el test de bloqueo muerde" (`hjulia-revision-cambio`, paso 3)
acá es: correrlo con el `Code.gs` viejo pusheado a test y ver que falla,
después con el nuevo. Nunca contra prod.
