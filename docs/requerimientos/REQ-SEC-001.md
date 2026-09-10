# REQ-SEC-001 — Token de sesión con expiración y revocable

> **Estado:** IMPLEMENTADO — `Code.gs` + `index.html`. Harness de node 44/44.
> Pendiente: QA en deployment de test (Duck) y deploy a producción por el owner.
> **Dueño técnico:** Bob · **AppSec:** Julia · **Front:** Jay · **QA:** Duck · **Infra:** Roy · **PM:** Paul
> **Depende de:** nada aguas arriba. Sube de prioridad porque REQ-ADMIN-001
> (config por web) no debería construirse sobre un token permanente.
> Ver contexto en [../modelo-datos.md](../modelo-datos.md) fila REQ-SEC-001.

## Problema

El token de sesión actual (`Code.gs`, `generateSessionToken`) es
`SHA-256(usuario_id + SESSION_SECRET)`:

1. **Permanente.** No tiene emisión ni expiración. Un token filtrado sirve para
   siempre.
2. **Irrevocable individualmente.** Al ser función pura del `usuario_id` + el
   secreto global, la única forma de invalidarlo es rotar `SESSION_SECRET`, y eso
   desloguea a las dos personas.
3. **Primitiva equivocada.** Es `hash(concatenación)`, no HMAC.
4. **Comparación no constante** (`sessionToken !== expected`).
5. **Identidad tomada del body.** `validateSession(token, body.userId)` — el
   `usuario_id` lo elige el cliente; que el control funcione depende de que el
   token esté atado a ese id. Manipular el parámetro es trivial si el token
   dejara de estar atado.

### Bug latente relacionado (se arregla acá)

`getUser` para el otro usuario manda `userId = <id del otro>` con el token
propio (`index.html`, `api()` + llamada en `loadOtherUsers`). `validateSession`
recalcula `hash(idDelOtro + SECRET)` ≠ token propio → **401 silencioso**, y el
front cae al fallback de mostrar el ID crudo. Hoy casi no se nota porque cada
persona ve mayormente sus propios planes.

## Diseño

**Sesiones con estado en el servidor.** Hoja nueva `Sesiones`, token opaco.

### Token

```
<session_id>.<secreto>
```

- `session_id` = `newId('ses')` — clave de búsqueda en la hoja.
- `secreto` = dos UUID v4 concatenados sin guiones (64 hex, ~244 bits reales).
  `Utilities.getUuid()` está respaldado por `SecureRandom`.
- El front lo trata como string opaco (ya lo hace). No cambia el formato de
  almacenamiento en `localStorage`.

### Hoja `Sesiones`

| Columna | Tipo | Notas |
|---|---|---|
| `session_id` | string (PK) | `ses_` + `newId()` |
| `usuario_id` | string (FK) | dueño de la sesión — **única fuente de identidad del request** |
| `token_hash` | string | **HMAC-SHA256(secreto, SESSION_SECRET)** en hex. El secreto crudo NUNCA se guarda. |
| `fecha_creacion` | datetime | ISO 8601 UTC |
| `fecha_expiracion` | datetime | ISO 8601 UTC — `fecha_creacion` + 15 días (absoluta) |
| `fecha_ultimo_uso` | datetime | ISO 8601 UTC — se actualiza como mucho 1×/hora (throttle de cuota) |
| `estado` | enum | `activa` \| `revocada` |
| `revocada_por` | string (FK) | `usuario_id` que revocó (self en logout; admin a futuro) |
| `fecha_revocacion` | datetime | ISO 8601 UTC |

### Validación (cada request no público)

1. Split del token en `session_id` + `secreto`. Formato inválido → `401`.
2. Buscar fila por `session_id`. No existe → `401`.
3. `estado === 'activa'`. Si no → `401`.
4. `now < fecha_expiracion`. Si no → `401`.
5. `HMAC(secreto) === token_hash` con **comparación de tiempo constante**. Si no
   → `401` (y log server-side con el `session_id`).
6. Si `fecha_ultimo_uso` tiene más de 1 h → actualizarla (no extiende la
   expiración; la expiración es absoluta).
7. Devuelve `{ userId }`. **El router inyecta ese `userId` en el request**; los
   handlers que operan "como el usuario" lo usan en vez de `body.userId`.
   Excepción: `getUser`, donde `body.userId` es el usuario objetivo a consultar
   (validación = sesión válida, sin chequeo por-usuario: las dos personas se ven
   entre sí, que es el punto de la app).

### Expiración

Absoluta, **15 días**. Al vencer, re-login con Google (1 tap si la sesión de
Google sigue viva). *Sliding expiration* (extender en cada uso, con tope) queda
como ajuste posterior si molesta en la práctica.

### Revocación

- Endpoint nuevo `logout`: marca `estado='revocada'` + `revocada_por` (el propio
  dueño) + `fecha_revocacion` en la fila de la sesión actual. **No pasa por el
  gate de sesión** — cerrar sesión tiene que funcionar aunque el token ya venció
  o ya se revocó. Siempre responde 200 (idempotente).
- Habilita "cerrar sesión en todos los dispositivos" (revocar todas las sesiones
  `activa` de un `usuario_id`) sin trabajo extra de modelo — no entra en este REQ.

### Limpieza

`purgarSesiones()` — función para **trigger time-driven semanal** (lo crea Roy).
Borra filas `revocada` o vencidas hace más de 7 días. Las sesiones recientes
(activas o recién vencidas) quedan visibles para inspección. El log de accesos
**durable** es la futura hoja `Auditoria` (REQ-DATA-002), que registra un evento
`login` por cada login; `Sesiones` es el almacén de tokens vivos y se puede
podar.

## Alcance — entra

- Hoja `Sesiones` + `SESIONES_HEADERS`.
- `setupSheets()` crea `Sesiones` (idempotente).
- Helpers: `crearSesion`, `validarSesion`, `getSesionRow`, `revocarSesion`,
  `tocarSesion`, `hmacHex`, `comparacionConstante`, `generarSecretoSesion`.
- `handleLoginGoogle` usa `crearSesion`.
- Router `doPost`: resuelve la sesión, inyecta `usuario_id`, 401 genérico.
- Endpoint `logout` + `handleLogout`.
- `purgarSesiones()`.
- Se eliminan `generateSessionToken` y `validateSession`.
- **Front (`index.html`)**: `api()` con handler global de 401 → `forceLogout()`
  (limpia sesión, vuelve al login con "Tu sesión expiró"). Botón de logout llama
  al endpoint `logout` antes de limpiar local (best-effort).

## Alcance — NO entra

- "Cerrar sesión en todos lados" (UI + endpoint) → REQ posterior si se pide.
- Rate limiting de login → no hay superficie hoy (Google hace el trabajo pesado).
- Mover el token a cookie HttpOnly → requiere rework del modelo cross-origin
  github.io ↔ Apps Script. Riesgo residual ya aceptado en REQ-AUTH-001.
- Hoja `Auditoria` → REQ-DATA-002.
- IP / user-agent en `Sesiones` → Apps Script no los da de forma confiable;
  sería recolectar datos personales de más (Ley 25.326).

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | `setupSheets()` crea `Sesiones` con los 9 headers exactos. Correrlo dos veces no duplica hoja ni headers. Las hojas existentes no se tocan. |
| 2 | `loginGoogle` OK devuelve un `sessionToken` con formato `ses_<...>.<64 hex>` y crea **una** fila `activa` en `Sesiones` con `token_hash` = HMAC (no el secreto crudo), `fecha_expiracion` = creación + 15 días. |
| 3 | Un request con ese token a un endpoint privado (`getPlanes`) responde 200. |
| 4 | Request sin token → 400/401. Token con formato roto (`abc`, `abc.`, `.xyz`) → 401. `session_id` inexistente → 401. Secreto cambiado (mismo `session_id`, otro secreto) → 401. |
| 5 | Token de una sesión con `fecha_expiracion` en el pasado → 401. |
| 6 | Tras `logout`, el mismo token → 401 en el siguiente request. `logout` repetido → 200 (idempotente). El token de la **otra** persona sigue funcionando. |
| 7 | La identidad del request sale de la sesión: si el body manda `userId` de otra persona en `createPlan` / `uploadPhoto`, el plan/avatar se crea a nombre del **dueño del token**, no del `userId` del body. |
| 8 | `getUser` con `userId` = la otra persona, usando un token válido propio, responde 200 con los datos de esa persona (arregla el bug latente). |
| 9 | `hmacHex` usa `computeHmacSha256Signature` (HMAC real). La comparación de hashes es de tiempo constante (no `===` directo sobre el hash). |
| 10 | Ningún `Logger.log` incluye el `sessionToken`, el `secreto` ni el `token_hash` completo. |
| 11 | `purgarSesiones()` borra filas `revocada` y vencidas hace +7 días; deja las activas y las recién vencidas. Idempotente. |
| 12 | **Sin regresión**: login, ver/crear/editar/completar/borrar planes, ver/crear/editar/borrar categorías, ver avatar, subir avatar — todo igual que antes. |
| 13 | Front: con un token vencido/revocado en `localStorage`, al abrir la app se vuelve al login con el mensaje de sesión expirada (no queda en pantalla en blanco). |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Ahora cada request hace una lectura de `Sesiones` (antes 0) | Hoja chica (2–10 filas). Todos los endpoints ya abren la planilla. Costo despreciable a esta escala. |
| `Sesiones` es punto único: si se corrompe, nadie entra | Mismo riesgo que cualquier hoja del modelo. `setupSheets()` la recrea; los usuarios re-login. |
| `appendRow` concurrente en login | `LockService.getScriptLock()` en `crearSesion`. Con 2 usuarios es casi imposible, pero queda correcto. |
| `Utilities.getUuid()` como fuente de aleatoriedad | Respaldado por `SecureRandom`. Dos UUID concatenados = ~244 bits. Suficiente. |
| Fuga de la hoja `Sesiones` | Solo contiene `token_hash` (HMAC). Sin `SESSION_SECRET` no se puede forjar ni un token ni derivar el secreto. |
| Flash de pantalla al restaurar sesión vencida | `initApp()` cambia de pantalla y `forceLogout()` la revierte. Aceptable; alternativa (pre-validar) no vale el código. |

## Plan de pruebas (Duck)

### Backend — `probarSesiones()` en el editor del proyecto de test

Función de test (`scratchpad/probarSesiones.gs`) que se pega al final del
`Code.gs` de test y se corre desde el editor. Usa los primitivos reales de Apps
Script (`LockService`, HMAC de `Utilities`, lectura/escritura real de la hoja
`Sesiones`), crea filas de prueba y las borra al final. **28 checks**, cubre
criterios 1–9 y 11. Validada contra los mocks de node (28/28) antes de entregar.

> No reemplaza dos verificaciones: (a) concurrencia real de `crearSesion`
> (dos logins simultáneos) — se prueba a mano abriendo dos pestañas;
> (b) los criterios de frontend (ver abajo).

### Frontend — verificado en el panel del navegador (sobre el snapshot estático)

`api()` con `fetch` mockeado devolviendo 401:

- Un 401 → `forceLogout`: vuelve al login, sesión y `localStorage` limpios,
  cartel "Tu sesión expiró. Entrá de nuevo.". Sin excepción. (criterio 13)
- 3 respuestas 401 en paralelo → no apila pantallas ni tira excepción
  (reentrancia).
- Logout manual con token ya muerto (401) → no muestra el cartel de expiración
  (`SILENT_401`).

Guardas agregadas de paso: `saveSession` / `loadSession` / `clearSession`
envueltos en try/catch — `localStorage` puede tirar (modo privado, storage
deshabilitado) y no debe romper el flujo de sesión.

### End-to-end con login real (pendiente — necesita Web App de test o se hace en prod)

El proyecto de test **no tiene Web App publicado**, así que el flujo completo
(login de Google real → sesión creada → navegar → logout) no se pudo correr
contra HTTP. Opciones:

1. Publicar un Web App de test (Script Properties propias, `index.html` de test
   servido desde cualquier ruta de `franago.github.io` para que el origen OAuth
   valide) y correr T1–T6.
2. Verificarlo como **primer paso del deploy a producción**: bajo riesgo (si el
   login falla se nota al instante y se revierte a la versión anterior).

## Deploy (Roy + owner)

1. Pegar `Code.gs` nuevo en el Apps Script de producción.
2. Correr `setupSheets()` (crea `Sesiones`).
3. Crear el **trigger time-driven** semanal → `purgarSesiones`.
4. Republicar el Web App (misma URL: *editar implementación → versión nueva*).
5. Deploy de `index.html` a GitHub Pages.
6. **Las sesiones actuales se cortan** (el token viejo ya no valida): las dos
   personas hacen login de nuevo una vez. Avisar antes.

## Revisión de QA (Duck) — código + harness

Trazado de scope de todas las funciones nuevas (todas declaraciones top-level,
constantes top-level — acceso correcto). Sin bugs bloqueantes. Notas:

- **N1 (corregido)**: `tocarSesion` leía el índice de columna del `const`
  `SESIONES_HEADERS` en vez del header real de la hoja como sus hermanas. Se
  igualó al patrón de `getSesionRow` (lee `sheet.getRange(1,1,...)`).
- **N2 (verificar en test)**: `LockService` en `crearSesion` está mockeado como
  no-op en el harness. Probar en el deployment de test: dos logins rápidos
  seguidos no deben pisar filas.
- **N3 (manual)**: criterio 13 (front vuelve al login con token vencido en
  `localStorage`) no lo cubre el harness (es backend). Test de navegador:
  editar `fecha_expiracion` a pasado y recargar.
- **N4 (confirmado con diseño)**: `getUser` con sesión válida devuelve
  `nombre_display` + `foto_url` de cualquier usuario (antes daba 401 por el bug
  latente). Es lo esperado — las dos personas ya se ven en la UI. No expone
  `email` ni `google_sub`.

### Harness `node` (Sheets / Utilities / LockService / ContentService mockeados)

44/44 checks. Cubre criterios 1–12. Casos: formato de token, exp +15d,
`token_hash` ≠ secreto, token roto / `session_id` inexistente / secreto
cambiado → 401, sesión vencida → 401, logout revoca + idempotente + no toca la
otra sesión, identidad desde la sesión (no del body), `getUser` cruzado, HMAC
real + comparación constante, logs sin secreto, `purgarSesiones`, CRUD sin
regresión.

## Hotfix post-deploy (2026-09-09) — pantalla negra al loguearse

Tras el deploy a producción, el login entraba pero quedaba en pantalla negra
hasta recargar. Causa: `crearSesion` hacía `appendRow` en la hoja `Sesiones` y
el request de login terminaba; el frontend disparaba `getCategorias`/`getPlanes`
de inmediato (otras invocaciones del Web App) y esos requests **no veían todavía
la fila** (Apps Script bufferea escrituras de Sheets) → 401 → `initApp` ya había
cambiado de pantalla.

- `Code.gs`: `SpreadsheetApp.flush()` al final de `crearSesion` (dentro del lock)
  y de `revocarSesion` (para que el logout haga efecto en el request siguiente).
- `index.html`: overlay `#app-loading` mientras `initApp()` trae los datos
  (antes: pantalla negra durante el arranque en frío del Web App). `initApp`
  ahora es resiliente: si un 401 dispara `forceLogout` en el medio corta limpio;
  si la carga falla por otro motivo muestra "Reintentar" en vez de quedar negra.
  `forceLogout` oculta el overlay para no tapar el login.

Verificado en el navegador: carga OK oculta el overlay, error muestra Reintentar,
401 en el medio → login sin overlay encima.

## Cierre

_pendiente — QA en producción tras el hotfix + smoke_
