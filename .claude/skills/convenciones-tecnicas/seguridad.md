# Seguridad: lo propio de Nuestros Planes

El procedimiento general está en `hjulia-revision-cambio`. Acá, solo lo
que ese procedimiento necesita saber de este proyecto. El diseño de cada
control está en `docs/requerimientos/REQ-SEC-*.md` y `README.md`
("Seguridad").

Contenido: 1. Qué capa decide · 2. Cuentas · 3. Sesión · 4. Datos en el
HTML · 5. Archivos de Drive · 6. Auditoría y datos personales · 7. Tests.

## 1. Qué capa decide

No hay reglas de base de datos: la planilla no es accesible para el
cliente. **Todo control real vive en `Code.gs`**. Lo que el front oculta
o deshabilita es cosmético. La Web App es `ANYONE_ANONYMOUS`: cualquiera
puede llamar a `doPost` con cualquier parámetro.

- La sesión la valida el router, no cada handler: `doPost` llama a
  `validarSesion` para toda acción que no esté en `publicActions` y pisa
  `body.userId` con el de la sesión. Un endpoint nuevo **no va en
  `publicActions`** y usa `body.authUserId`, nunca un id que venga del body
  (única excepción: `getUser`).
- Lo que cada acción permite (dueño, estado, tipo de archivo) lo decide su
  handler. Revisar leer, crear, modificar y borrar por separado.
- Un test tiene que entrar por `doPost`, igual que el front. Llamar al
  handler directo saltea el gate de sesión y no prueba el acceso.

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
- `validarSesion` mira `Sesiones`, no `Usuarios`. La lista blanca la
  vuelve a chequear el router (`usuarioHabilitado`, después de
  `validarSesion`): sacar la fila de alguien o vaciar su email corta sus
  sesiones en hasta 30 s (caché de `Usuarios`). No va dentro de
  `validarSesion` porque el fast-path y el puente devuelven `userId` sin
  leer hojas. Si la fila vuelve, una sesión sin vencer vuelve a andar.
  Test: `probarBL015` (BL-015). La matriz de acceso lleva la fila "cuenta
  dada de baja con sesión todavía válida".
- Al cerrar sesión (manual o por 401) el front borra `cp_session`,
  `cp_image_cache` y `avatarCache` (`borrarImageCache`, BL-016). Todo lo
  que escriba en `localStorage` datos del usuario tiene que borrarse ahí
  también, y no volver a escribirse si un pedido resuelve después del
  logout (chequear `state.session` al volver). El DOM de la app oculta
  sigue con datos hasta cerrar la pestaña (BL-021).
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

Las fotos se muestran siempre desde `getArchivo`/`getArchivos` (con
sesión), que las devuelven como data URL. Los archivos de Drive son
privados (`revocarSharingPublicoArchivos`), así que ninguna URL de Google
alcanza para verlos sin la cuenta del dueño.

Excepción que ya existe: el avatar guarda en `Usuarios.fotoUrl` una URL
`drive.google.com/thumbnail?id=…` y esa URL llega al cliente (`getUser`,
respuesta de `uploadPhoto`). Expone el id del archivo, no el contenido. Lo
nuevo no suma URLs de Google al cliente.

Una miniatura de Drive (BL-011, REQ-PERF-004) se baja en el servidor, y su
`thumbnailLink` no va al cliente ni a los logs. Esa URL sale siempre de
`Drive.Files.get` sobre el `drive_file_id` de la hoja, nunca de un
parámetro del pedido: el pedido al link lleva el token del dueño.

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
