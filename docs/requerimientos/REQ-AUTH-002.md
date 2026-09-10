# REQ-AUTH-002 — Selección de cuenta en el login de Google

> **Estado:** CERRADO (2026-09-10) — desplegado a producción. Harness node 9/9
> (login e2e: 53/53 en total), smoke de frontend + e2e con Google real.
> Ver [Cierre](#cierre).
> **Dueño técnico:** Jay (front) + Bob (verificación) · **AppSec:** Julia · **QA:** Duck
> **Depende de:** nada. Se deploya junto con REQ-SEC-001 y REQ-SEC-002 (los tres
> tocan auth → un solo re-login).

## Problema

El login usa `google.accounts.id` (el botón "sin fricción" que devuelve un
**ID token**). Esa API no tiene forma de forzar el selector de cuenta: si hay
una sesión de Google activa en el navegador, agarra esa cuenta y devuelve el
token sin preguntar. Si esa cuenta no está en la whitelist, el backend responde
403 y el usuario **nunca llegó a elegir** la cuenta correcta.

Además el botón actual es un hack: un botón real de Google invisible
(`#g_id_signin`, `opacity: 0.001`, `iframe { transform: scale(2.4) }`) tapado
por un botón custom que capta el clic.

## Diseño

Cambiar a **`google.accounts.oauth2.initTokenClient`** con
`prompt: 'select_account'`.

### Frontend

- Se elimina `google.accounts.id.initialize` / `renderButton` y todo el overlay
  (`#g_id_signin` y su CSS). El `#gsi-custom` pasa a ser un `<button>` real.
- Al cargar la librería GSI:

  ```js
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'openid email',
    prompt: 'select_account',     // siempre muestra el selector
    callback: handleGoogleToken,  // recibe { access_token, ... }
    error_callback: ...,          // popup cerrado / no se pudo abrir
  });
  ```

- Click del botón → `tokenClient.requestAccessToken()` (síncrono, cuenta como
  gesto de usuario → el popup no se bloquea).
- El front manda `{ action: 'loginGoogle', accessToken }` en vez de `idToken`.

### Backend (`Code.gs`)

- `handleLoginGoogle` lee `body.accessToken`.
- `verifyGoogleIdToken` → **`verifyGoogleAccessToken`**:

  ```
  GET https://oauth2.googleapis.com/tokeninfo?access_token=<TOKEN>
  ```

  Valida:
  1. HTTP 200.
  2. `aud === OAUTH_CLIENT_ID` **o** `azp === OAUTH_CLIENT_ID` (el token fue
     emitido para NUESTRO cliente — corta sustitución de token de otra app).
  3. `email_verified === true` (tokeninfo devuelve strings: `'true'`).
  4. No vencido: `Number(exp) * 1000 > Date.now()` (5 min de tolerancia).
  5. `scope` incluye un scope de email (si no, no habría `email`).

  Devuelve `{ email, sub, email_verified }`. El resto de `handleLoginGoogle`
  (whitelist por email, `crearSesion`) **no cambia**.

### Por qué es equivalente en seguridad

- El código de hoy **ya** hace una llamada de red a `tokeninfo?id_token=`. Pasar
  a `tokeninfo?access_token=` no agrega latencia ni superficie.
- La ventaja teórica del ID token (verificable con firma sin red) no se usaba.
- Un access token de scope `openid email` filtrado deja leer el email/perfil
  básico de Google ~1 h. **No** deja loguearse en la app (para eso hace falta
  pasar la whitelist y recibir un token de sesión nuestro). Un ID token filtrado
  sí dejaría entrar. Neto: igual o mejor para esta app.
- El access token se usa una vez, server-side, y no se guarda.

### Google Cloud

Sin cambios. El OAuth client ya es "Web application" con
`https://franago.github.io` como origen JavaScript autorizado, que es lo que
`initTokenClient` necesita. Consent screen sigue en Testing con los usuarios de
prueba cargados.

## Alcance — NO entra

- One Tap / login automático al volver: no lo va a haber más. Con sesión de 15
  días (REQ-SEC-001) y login explícito con selector, es aceptable y más claro.
- `scope: 'profile'`: no se pide. El nombre y el avatar salen de la hoja y del
  modelo de archivos, no de Google.
- Cookie HttpOnly para el token de sesión: fuera de alcance (igual que siempre).

## Criterios de aceptación (Duck)

| # | Criterio |
|---|---|
| 1 | El botón "Continuar con Google" abre **siempre** el selector de cuenta de Google, aunque haya una sola sesión activa. |
| 2 | Elegir la cuenta whitelisteada (Fran / Noelia) → entra, se crea la sesión (fila en `Sesiones`), carga la app. |
| 3 | Elegir una cuenta **no** whitelisteada → error "Cuenta no autorizada…", vuelve al botón, **sin** dejar el estado "cargando" pegado. |
| 4 | Cerrar el popup de Google sin elegir → vuelve al botón, sin "cargando" pegado, sin error rojo. |
| 5 | `loginGoogle` sin `accessToken` → 400. Con un `accessToken` inválido / vencido → 401. |
| 6 | Token de acceso emitido para otro `client_id` → 401 (no matchea `aud`/`azp`). |
| 7 | No queda nada del overlay: no hay `#g_id_signin` en el DOM, el botón es un `<button>`. |
| 8 | Regresión: una vez logueado, todo el resto de la app igual (REQ-SEC-001/002 no se ven afectados). |
| 9 | Ningún `Logger.log` incluye el `accessToken`. |

## Verificación hecha

### Harness de node (`tokeninfo` mockeado) — 9/9

- login OK con access token válido → 200 + `sessionToken`
- sin `accessToken` → 400
- `tokeninfo` != 200 → 401
- `aud`/`azp` de otro client_id → 401
- `email_verified: 'false'` → 401
- token vencido → 401
- `scope` sin email → 401
- email válido no whitelisteado → 403
- el log no contiene el access token

### Frontend en el navegador (snapshot estático, `initTokenClient` stubeado)

- `initGoogleAuth` → `initTokenClient({ scope:'openid email', prompt:'select_account' })`
- click del botón → `is-loading` + `requestAccessToken()` (1 vez, síncrono)
- `callback({error:'access_denied'})` → limpia `is-loading`, sin error rojo
- `error_callback` (popup cerrado) → limpia `is-loading`
- `callback({access_token})` → manda `{action:'loginGoogle', accessToken}` (no `idToken`)
- respuesta 403 → limpia `is-loading`, muestra "Cuenta no autorizada…"
- `#gsi-custom` es `<button>`, `#g_id_signin` no existe en el DOM
- estética del botón intacta (borde cobre, barrido de luz en hover)
- Nota: en el snapshot `data:` la librería real `google.accounts.oauth2`
  cargó y `initTokenClient` no tiró — buena señal para el deploy real.

### e2e en producción con Google real (2026-09-10)

- El popup de Google **muestra el selector de cuenta** aunque haya una sola
  sesión activa (criterio 1).
- Elegir la cuenta whitelisteada → entra, se crea la sesión (criterio 2).
- Cuenta no whitelisteada → "Cuenta no autorizada para esta aplicación.",
  vuelve al botón sin quedar "cargando" (criterio 3).
- Backend en vivo: `loginGoogle` con el campo viejo `idToken` → 400 "Token de
  Google requerido." (confirma que lee `accessToken`).
- Sin `#g_id_signin` en el DOM; el botón es un `<button>` (criterio 7).
- Los errores `Cross-Origin-Opener-Policy would block the window.closed call`
  en consola son ruido de la librería GSI (el popup de accounts.google.com
  corta la relación con el opener). No bloquean la entrega del token.

### Revisión de seguridad (Julia)

APTO. `aud`/`azp === OAUTH_CLIENT_ID` corta confused-deputy; `email_verified`
+ `exp` + `scope` chequeados antes de la whitelist; el access token no se
loguea ni se guarda. Postura igual a la del ID token, con una mejora: un
access token `openid email` filtrado no deja entrar a la app. Dead code
inofensivo: el re-chequeo de `email_verified` en `handleLoginGoogle` (403)
quedó inalcanzable (lo corta antes `verifyGoogleAccessToken` con 401).

## Cierre

**2026-09-10 — CERRADO.** Desplegado a producción junto con REQ-SEC-001 /
SEC-002. Jay entregó, Julia dio APTO, Duck aprobó los criterios 1–3 y 7 con
Google real; 4–6, 9 por harness (9/9). Sin cambios en Google Cloud.
