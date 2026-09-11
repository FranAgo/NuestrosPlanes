// ============================================================
// COUPLE PLANS — Google Apps Script Backend
// Modelo de datos: Google Sheets
// Hojas requeridas: Usuarios, Categorias, Planes, Archivos, Sesiones
// Diseño del modelo: docs/modelo-datos.md
// Sesiones: docs/requerimientos/REQ-SEC-001.md
// ============================================================

// ------------------------------------------------------------
// CONFIGURACIÓN
// ------------------------------------------------------------

// Toda la configuración sensible vive en Script Properties, no en el código.
// Configurar una sola vez con setupConfig() o desde
// Project Settings > Script Properties:
//   SPREADSHEET_ID   -> ID de la planilla de datos
//   DRIVE_FOLDER_ID  -> carpeta de Drive para fotos de perfil
//   OAUTH_CLIENT_ID  -> Client ID de Google OAuth (mismo que usa el frontend)
//   SESSION_SECRET   -> string aleatorio largo para firmar los tokens de sesión
const PROPS = PropertiesService.getScriptProperties();
const SPREADSHEET_ID  = PROPS.getProperty('SPREADSHEET_ID');
const DRIVE_FOLDER_ID = PROPS.getProperty('DRIVE_FOLDER_ID');
const OAUTH_CLIENT_ID = PROPS.getProperty('OAUTH_CLIENT_ID');
const SESSION_SECRET  = PROPS.getProperty('SESSION_SECRET');

const SHEETS = {
  USUARIOS:    'Usuarios',
  CATEGORIAS:  'Categorias',
  PLANES:      'Planes',
  ARCHIVOS:    'Archivos',
  SESIONES:    'Sesiones',
  AUDITORIA:   'Auditoria',
};

// Esquema de la hoja Sesiones. Ver docs/requerimientos/REQ-SEC-001.md.
// Fuente única del orden de columnas: se reutiliza en el setup y en crearSesion().
const SESIONES_HEADERS = [
  'session_id', 'usuario_id', 'token_hash',
  'fecha_creacion', 'fecha_expiracion', 'fecha_ultimo_uso',
  'estado', 'revocada_por', 'fecha_revocacion',
];

// Vida de una sesión desde que se crea (expiración absoluta, no sliding).
const SESION_TTL_MS = 15 * 24 * 60 * 60 * 1000;

// Cada cuánto, como máximo, se reescribe fecha_ultimo_uso (throttle de cuota
// de escritura: no queremos un write de Sheets en cada request).
const SESION_TOUCH_MS = 60 * 60 * 1000;

// Gracia antes de que purgarSesiones() borre una sesión vencida.
const SESION_PURGA_GRACIA_MS = 7 * 24 * 60 * 60 * 1000;

// Puente anti-carrera para la ventana post-login. crearSesion() escribe la fila
// en Sesiones y el frontend dispara getCategorias/getPlanes de inmediato (otra
// invocación del Web App, posible otra instancia). Esa fila puede no ser visible
// todavía y validarSesion() daría un 401 espurio. crearSesion() deja una entrada
// en CacheService (compartido entre instancias, propagación rápida) que
// validarSesion() usa SOLO como fallback cuando la hoja aún no tiene la fila.
// NO es el lifetime de la sesión: la vida real sigue siendo SESION_TTL_MS en la
// hoja. TTL corto a propósito: solo tiene que cubrir los segundos post-login.
const SESION_CACHE_BRIDGE_SEC = 120;

// Esquema de la hoja Archivos. Ver docs/modelo-datos.md sección 4.
// Se define una sola vez y se reutiliza en el setup y en las inserciones,
// así el orden de columnas nunca queda desincronizado.
const ARCHIVOS_HEADERS = [
  'archivo_id', 'owner_tipo', 'owner_id', 'proposito', 'titulo',
  'fecha_contenido', 'drive_file_id', 'mime_type', 'tamano_bytes',
  'subido_por', 'fecha_subida', 'modificado_por', 'fecha_modificacion',
  'estado', 'eliminado_por', 'fecha_eliminacion',
];

// Extensión de archivo según el tipo MIME, para nombrar el archivo en Drive.
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

// Esquema de Categorias y Planes con las columnas de auditoría (REQ-DATA-002).
// Las columnas nuevas van SIEMPRE al final: setupSheets() las agrega con
// ensureColumn() sin mover ni pisar los datos que ya están.
//   Categorias.estado: 'activa' | 'eliminada'
//   Planes.estado:     'pendiente' | 'completado' | 'eliminado'
const CATEGORIAS_HEADERS = [
  'categoria_id', 'nombre', 'color_hex',
  'creado_por', 'fecha_creacion', 'modificado_por', 'fecha_modificacion',
  'estado', 'eliminado_por', 'fecha_eliminacion',
];

const PLANES_HEADERS = [
  'plan_id', 'titulo', 'categoria_id', 'creado_por',
  'fecha_creacion', 'fecha_programada', 'fecha_vencimiento', 'estado',
  'modificado_por', 'fecha_modificacion', 'eliminado_por', 'fecha_eliminacion',
];

// Hoja Auditoria (REQ-DATA-002, ver docs/modelo-datos.md sección 8).
// Log liviano de accesos y cambios sensibles — la app maneja datos personales
// (Ley 25.326). Todos los timestamps en ISO 8601 UTC.
const AUDITORIA_HEADERS = [
  'fecha', 'usuario_id', 'accion', 'entidad', 'entidad_id', 'detalle',
];

// Claves permitidas en Auditoria.detalle. registrarAuditoria() descarta
// cualquier otra clave antes de serializar — nunca confía en el que llama.
// Prohibido explícito: token, token_hash, sessionToken, secreto, google_sub,
// password y cualquier contenido binario/base64.
const AUDITORIA_DETALLE_CLAVES_OK = [
  'email', 'nombre', 'titulo', 'valor_anterior', 'valor_nuevo', 'motivo',
];

// ------------------------------------------------------------
// ENTRY POINT — Router principal
// ------------------------------------------------------------

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // Endpoints que NO requieren sesión válida
    const publicActions = ['loginGoogle'];

    // logout no pasa por el gate de sesión: cerrar sesión tiene que funcionar
    // siempre, incluso si el token ya venció o ya se revocó (idempotente).
    if (action === 'logout') return handleLogout(body);

    if (!publicActions.includes(action)) {
      const sesion = validarSesion(body.sessionToken);
      if (sesion.error) return respond(401, { error: sesion.error });

      // La identidad del request sale de la sesión, nunca del body.
      // getUser es la excepción: ahí body.userId es el usuario objetivo a
      // consultar (las dos personas se ven entre sí). El resto de los
      // handlers opera "como el dueño del token".
      body.authUserId = sesion.userId;
      if (action !== 'getUser') body.userId = sesion.userId;
    }

    switch (action) {
      // Auth
      case 'loginGoogle':     return handleLoginGoogle(body);

      // Usuarios
      case 'getUser':         return handleGetUser(body);
      case 'uploadPhoto':     return handleUploadPhoto(body);

      // Categorías
      case 'getCategorias':   return handleGetCategorias(body);
      case 'createCategoria': return handleCreateCategoria(body);
      case 'updateCategoria': return handleUpdateCategoria(body);
      case 'deleteCategoria': return handleDeleteCategoria(body);

      // Planes
      case 'getPlanes':       return handleGetPlanes(body);
      case 'createPlan':      return handleCreatePlan(body);
      case 'updatePlan':      return handleUpdatePlan(body);
      case 'completePlan':    return handleCompletePlan(body);
      case 'deletePlan':      return handleDeletePlan(body);

      default:
        return respond(400, { error: 'Acción no reconocida.' });
    }
  } catch (err) {
    // No exponemos detalles internos al cliente
    Logger.log('Error en doPost: ' + err.toString());
    return respond(500, { error: 'Error interno del servidor.' });
  }
}

// ------------------------------------------------------------
// doGet — runner de la suite de tests, SOLO para el entorno de test.
//
// En producción la Script Property TEST_RUNNER_KEY no está definida, así que
// esto siempre devuelve 403 y no expone nada. No ejecuta funciones arbitrarias:
// solo corre probarDATA002() (definida en Tests.gs, que no se despliega a prod).
//
// Uso en test: setear TEST_RUNNER_KEY en Script Properties del proyecto de test
// y pegarle a  <URL del Web App>/exec?key=<TEST_RUNNER_KEY>
// ------------------------------------------------------------
function doGet(e) {
  try {
    const key  = PROPS.getProperty('TEST_RUNNER_KEY');
    const dada = (e && e.parameter && e.parameter.key) ? String(e.parameter.key) : '';

    if (!key || !comparacionConstante(dada, String(key))) {
      return respond(403, { error: 'No disponible.' });
    }
    if (typeof probarDATA002 !== 'function') {
      return respond(500, { error: 'La suite de tests no está desplegada en este entorno.' });
    }
    return respond(200, probarDATA002());
  } catch (err) {
    Logger.log('Error en doGet: ' + err.toString());
    return respond(500, { error: 'Error interno del servidor.' });
  }
}

// ------------------------------------------------------------
// AUTENTICACIÓN
// ------------------------------------------------------------

// Login con Google.
// El frontend usa google.accounts.oauth2.initTokenClient (con selector de
// cuenta) y manda el access token acá. Lo verificamos contra Google y solo
// dejamos entrar a los emails cargados en la hoja Usuarios (lista blanca).
// No se almacena ni se compara ninguna contraseña. Ver REQ-AUTH-002.
function handleLoginGoogle(body) {
  const { accessToken } = body;

  if (!accessToken) {
    return respond(400, { error: 'Token de Google requerido.' });
  }
  if (!OAUTH_CLIENT_ID || !SESSION_SECRET) {
    Logger.log('Falta configurar OAUTH_CLIENT_ID o SESSION_SECRET en Script Properties.');
    return respond(500, { error: 'Autenticación no configurada en el servidor.' });
  }

  const payload = verifyGoogleAccessToken(accessToken);
  if (!payload) {
    return respond(401, { error: 'Token de Google inválido o vencido.' });
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!emailVerified) {
    return respond(403, { error: 'El email de Google no está verificado.' });
  }

  const email = (payload.email || '').toString().trim().toLowerCase();
  const googleSub = (payload.sub || '').toString();

  const sheet = getSheet(SHEETS.USUARIOS);
  const data = sheet.getDataRange().getValues();

  // Headers: [usuario_id, nombre_display, email, google_sub, foto_url]
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = (row[2] || '').toString().trim().toLowerCase();
    if (rowEmail && rowEmail === email) {
      // Guardar el google_sub la primera vez que entra, para trazabilidad.
      if (!row[3] && googleSub) {
        sheet.getRange(i + 1, 4).setValue(googleSub);
      }

      const userId = row[0];
      const sessionToken = crearSesion(userId);

      // El login exitoso NO escribe en Auditoria a propósito: la hoja Sesiones
      // ya registra cada login (fila nueva con usuario_id + fecha_creacion), y
      // agregarle una escritura más al login —la ruta más sensible a cold start
      // y a condiciones de carrera con los getCategorias/getPlanes que el
      // frontend dispara acto seguido— es riesgo puro sin beneficio.

      return respond(200, {
        sessionToken,
        user: {
          userId:        userId,
          nombreDisplay: row[1],
          fotoUrl:       row[4] || null,
        }
      });
    }
  }

  // Email con token de Google válido pero fuera de la lista blanca. Se
  // enmascara: es PII de un tercero que no es usuario del sistema y solo nos
  // interesa detectar reintentos del mismo origen (revisión de Julia).
  registrarAuditoria('', 'login_denegado', 'Usuarios', '', { email: enmascararEmail(email) });
  return respond(403, { error: 'Cuenta no autorizada para esta aplicación.' });
}

// Verifica el access token contra el endpoint oficial de Google (tokeninfo).
// Nos importan tres cosas: que el token sea para NUESTRA app, que el email esté
// verificado y que no esté vencido. Devuelve el payload o null.
function verifyGoogleAccessToken(accessToken) {
  try {
    const url = 'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;

    const payload = JSON.parse(res.getContentText());

    // El token tiene que haber sido emitido para nuestro Client ID.
    // En un access token de un cliente web, aud y azp son el client_id.
    if (payload.aud !== OAUTH_CLIENT_ID && payload.azp !== OAUTH_CLIENT_ID) {
      return null;
    }

    // El scope tiene que incluir el permiso de email, si no no habría email.
    if (!payload.scope || payload.scope.indexOf('email') === -1) return null;

    // Email verificado (tokeninfo devuelve strings).
    if (payload.email_verified !== 'true' && payload.email_verified !== true) return null;

    // No vencido (con 5 min de tolerancia de reloj).
    if (payload.exp && (Number(payload.exp) * 1000) < (Date.now() - 5 * 60 * 1000)) {
      return null;
    }

    return payload;
  } catch (err) {
    Logger.log('verifyGoogleAccessToken error: ' + err.toString());
    return null;
  }
}

// ------------------------------------------------------------
// SESIONES  (REQ-SEC-001)
// Sesiones con estado en la hoja Sesiones. Token opaco:
//   <session_id>.<secreto>
// La hoja guarda HMAC-SHA256(secreto, SESSION_SECRET), nunca el secreto crudo.
// Expiración absoluta (SESION_TTL_MS). Revocable de a una (endpoint logout).
// ------------------------------------------------------------

// Crea una sesión nueva y devuelve el token para el cliente.
function crearSesion(userId) {
  const sessionId = newId('ses');
  const secreto   = generarSecretoSesion();
  const tokenHash = hmacHex(secreto);   // mismo valor a la hoja y al puente de cache
  const ahora     = new Date();
  const exp       = new Date(ahora.getTime() + SESION_TTL_MS);
  const ahoraIso  = ahora.toISOString();

  const fila = SESIONES_HEADERS.map(col => {
    switch (col) {
      case 'session_id':       return sessionId;
      case 'usuario_id':       return userId;
      case 'token_hash':       return tokenHash;
      case 'fecha_creacion':   return ahoraIso;
      case 'fecha_expiracion': return exp.toISOString();
      case 'fecha_ultimo_uso': return ahoraIso;
      case 'estado':           return 'activa';
      case 'revocada_por':     return '';
      case 'fecha_revocacion': return '';
      default:                 return '';
    }
  });

  const sheet = getSheet(SHEETS.SESIONES);
  const lock  = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow(fila);
    // Forzar el commit: el request de login termina acá y el frontend dispara
    // getCategorias/getPlanes de inmediato (otra invocación del Web App).
    // Sin flush(), esos requests pueden no ver todavía la fila y dar 401.
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // Puente anti-carrera: dejamos constancia de la sesión recién creada en un
  // almacén compartido entre instancias del Web App, para que los requests que
  // el frontend dispara de inmediato no den un 401 espurio si todavía no ven la
  // fila. Best-effort: si falla, la sesión ya está en la hoja igual. Guardamos
  // solo el hash del token (el mismo que va a la hoja), el usuario y la
  // expiración. Nunca el secreto crudo ni el token completo.
  try {
    CacheService.getScriptCache().put(
      'sesion:' + sessionId,
      JSON.stringify({ h: tokenHash, u: userId, exp: exp.toISOString() }),
      SESION_CACHE_BRIDGE_SEC
    );
  } catch (err) {
    Logger.log('crearSesion: no se pudo escribir el puente de cache (' + sessionId + '): ' + err.toString());
  }

  return sessionId + '.' + secreto;
}

// Valida el token de un request. Devuelve { userId } si es válida, o
// { error } con un mensaje genérico si no. El detalle real va solo al log.
function validarSesion(sessionToken) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    return { error: 'Sesión requerida.' };
  }

  const punto = sessionToken.indexOf('.');
  if (punto < 1 || punto === sessionToken.length - 1) {
    return { error: 'Sesión inválida o expirada.' };
  }
  const sessionId = sessionToken.slice(0, punto);
  const secreto   = sessionToken.slice(punto + 1);

  // La lectura de la hoja va fuera de try/catch a propósito: si getSesionRow()
  // tira (falla transitoria de Sheets), el error propaga como siempre y NO se
  // consulta el puente de cache. La cache solo entra cuando la hoja respondió
  // bien pero todavía no tiene la fila (carrera post-login, ver Bug B).
  const fila = getSesionRow(sessionId);
  if (!fila) {
    const desdePuente = validarDesdePuente(sessionId, secreto);
    if (desdePuente) {
      Logger.log('validarSesion: servida desde cache-puente (' + sessionId + ').');
      return desdePuente;
    }
    Logger.log('validarSesion: session_id inexistente (' + sessionId + ').');
    return { error: 'Sesión inválida o expirada.' };
  }
  if (fila.estado !== 'activa') {
    Logger.log('validarSesion: sesión no activa (' + sessionId + ').');
    return { error: 'Sesión inválida o expirada.' };
  }

  const ahora = Date.now();
  if (new Date(fila.fecha_expiracion).getTime() < ahora) {
    Logger.log('validarSesion: sesión vencida (' + sessionId + ').');
    return { error: 'Sesión inválida o expirada.' };
  }

  if (!comparacionConstante(hmacHex(secreto), String(fila.token_hash))) {
    Logger.log('validarSesion: hash no coincide (' + sessionId + ').');
    return { error: 'Sesión inválida o expirada.' };
  }

  // fecha_ultimo_uso: se reescribe como mucho 1×/hora. No extiende la
  // expiración (es absoluta), solo sirve de rastro de uso.
  const ultimoUso = new Date(fila.fecha_ultimo_uso).getTime();
  if (isNaN(ultimoUso) || ahora - ultimoUso > SESION_TOUCH_MS) {
    tocarSesion(fila._rowIndex);
  }

  return { userId: fila.usuario_id };
}

// Fallback de validarSesion() para la ventana post-login: la fila de la sesión
// todavía no es visible en la hoja, pero crearSesion() dejó una entrada en el
// puente de cache. Devuelve { userId } si el token es auténtico y no expiró, o
// null para que validarSesion() siga con el rechazo normal.
//
// La cache NUNCA es autoridad de revocación ni expiración: solo prueba que la
// sesión existió y que el token coincide. La hoja sigue siendo la verdad
// (validarSesion() la consulta primero) y el logout borra esta entrada.
// Cualquier fallo o ausencia de cache devuelve null: nunca "válida" por error.
function validarDesdePuente(sessionId, secreto) {
  let crudo;
  try {
    crudo = CacheService.getScriptCache().get('sesion:' + sessionId);
  } catch (err) {
    Logger.log('validarDesdePuente: cache no disponible (' + sessionId + '): ' + err.toString());
    return null;
  }
  if (!crudo) return null;

  let entry;
  try {
    entry = JSON.parse(crudo);
  } catch (err) {
    Logger.log('validarDesdePuente: entrada de cache ilegible (' + sessionId + ').');
    return null;
  }
  if (!entry || !entry.h || !entry.exp || !entry.u) return null;

  if (new Date(entry.exp).getTime() < Date.now()) {
    Logger.log('validarDesdePuente: entrada de cache vencida (' + sessionId + ').');
    return null;
  }

  if (!comparacionConstante(hmacHex(secreto), String(entry.h))) {
    Logger.log('validarDesdePuente: hash no coincide (' + sessionId + ').');
    return null;
  }

  return { userId: entry.u };
}

// Endpoint: cierra la sesión del token del request. Siempre responde 200,
// incluso si la sesión ya no existía o ya estaba revocada (idempotente).
// No exige sesión válida a propósito: cerrar sesión no puede fallar.
function handleLogout(body) {
  const token     = (body.sessionToken || '').toString();
  const punto     = token.indexOf('.');
  const sessionId = punto > 0 ? token.slice(0, punto) : '';
  if (sessionId) {
    // El borrado del puente de cache va SIEMPRE, aun si revocarSesion() no
    // encuentra la fila (puede pasar si el login todavía no es visible en la
    // hoja). Si no, la sesión seguiría validándose por cache hasta
    // SESION_CACHE_BRIDGE_SEC después del logout.
    try {
      CacheService.getScriptCache().remove('sesion:' + sessionId);
    } catch (err) {
      Logger.log('handleLogout: no se pudo borrar el puente de cache (' + sessionId + '): ' + err.toString());
    }

    const usuarioId = revocarSesion(sessionId);
    if (usuarioId !== null) {
      registrarAuditoria(usuarioId, 'logout', 'Sesiones', sessionId, {});
    }
  }
  return respond(200, { success: true });
}

// Marca una sesión como revocada. No borra la fila (purgarSesiones lo hace
// después). Idempotente: si ya estaba revocada o no existe, no hace nada.
// revocada_por = el propio dueño de la sesión (self-service logout).
// Devuelve el usuario_id de la sesión revocada (string, puede ser ''), o null
// si no había ninguna sesión activa con ese id.
function revocarSesion(sessionId) {
  const sheet = getSheet(SHEETS.SESIONES);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('session_id');
  const iUsr  = h.indexOf('usuario_id');
  const iEst  = h.indexOf('estado');
  const iPor  = h.indexOf('revocada_por');
  const iFec  = h.indexOf('fecha_revocacion');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] === sessionId && data[i][iEst] === 'activa') {
      sheet.getRange(i + 1, iEst + 1).setValue('revocada');
      sheet.getRange(i + 1, iPor + 1).setValue(data[i][iUsr] || '');
      sheet.getRange(i + 1, iFec + 1).setValue(new Date().toISOString());
      SpreadsheetApp.flush();  // el logout tiene que hacer efecto en el request siguiente
      return (data[i][iUsr] || '').toString();
    }
  }
  return null;
}

// Devuelve la fila de Sesiones como objeto { header: valor, _rowIndex }, o null.
function getSesionRow(sessionId) {
  const sheet = getSheet(SHEETS.SESIONES);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('session_id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] === sessionId) {
      const obj = { _rowIndex: i + 1 };
      h.forEach((col, j) => { obj[col] = data[i][j]; });
      return obj;
    }
  }
  return null;
}

// Actualiza fecha_ultimo_uso de una fila ya localizada. Lee el header real
// (igual que getSesionRow) para no depender del orden físico de columnas.
function tocarSesion(rowIndex) {
  const sheet   = getSheet(SHEETS.SESIONES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const iUso    = headers.indexOf('fecha_ultimo_uso');
  if (iUso === -1) return;
  sheet.getRange(rowIndex, iUso + 1).setValue(new Date().toISOString());
}

// Secreto de sesión: dos UUID v4 (respaldados por SecureRandom) sin guiones.
// 64 hex, ~244 bits reales de entropía.
function generarSecretoSesion() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

// HMAC-SHA256(mensaje, SESSION_SECRET) en hex.
function hmacHex(mensaje) {
  const raw = Utilities.computeHmacSha256Signature(mensaje, SESSION_SECRET);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// Comparación de strings de tiempo constante (no corta en la primera
// diferencia). Evita filtrar información por timing en el match del hash.
function comparacionConstante(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Trigger time-driven (semanal). Borra sesiones revocadas y las vencidas
// hace más de SESION_PURGA_GRACIA_MS. Deja las activas y las recién vencidas.
function purgarSesiones() {
  const sheet = getSheet(SHEETS.SESIONES);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iEst  = h.indexOf('estado');
  const iExp  = h.indexOf('fecha_expiracion');
  const ahora = Date.now();
  let borradas = 0;

  // De abajo hacia arriba: deleteRow no corre los índices de las filas de arriba.
  for (let i = data.length - 1; i >= 1; i--) {
    const revocada = data[i][iEst] === 'revocada';
    const exp      = new Date(data[i][iExp]).getTime();
    const vencidaHaceRato = !isNaN(exp) && (exp + SESION_PURGA_GRACIA_MS < ahora);
    if (revocada || vencidaHaceRato) {
      sheet.deleteRow(i + 1);
      borradas++;
    }
  }

  Logger.log('purgarSesiones: ' + borradas + ' fila(s) borrada(s).');
  return borradas;
}

// ------------------------------------------------------------
// USUARIOS
// ------------------------------------------------------------

function handleGetUser(body) {
  const { userId } = body;
  const sheet = getSheet(SHEETS.USUARIOS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === userId) {
      return respond(200, {
        userId:        row[0],
        nombreDisplay: row[1],
        fotoUrl:       row[4] || null,
      });
    }
  }

  return respond(404, { error: 'Usuario no encontrado.' });
}

function handleUploadPhoto(body) {
  const { userId, fileBase64, mimeType } = body;

  if (!fileBase64 || !mimeType) {
    return respond(400, { error: 'Archivo y tipo MIME requeridos.' });
  }

  if (!MIME_EXT[mimeType]) {
    return respond(400, { error: 'Tipo de archivo no permitido. Solo JPG, PNG o WEBP.' });
  }

  if (!userExists(userId)) {
    return respond(404, { error: 'Usuario no encontrado.' });
  }

  try {
    const bytes     = Utilities.base64Decode(fileBase64);
    const archivoId = newId('arc');
    const nombre    = archivoId + '.' + MIME_EXT[mimeType];

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file   = folder.createFile(Utilities.newBlob(bytes, mimeType, nombre));

    // Metadata en la descripción del archivo: si algún día se pierde la hoja
    // Archivos, se puede reconstruir recorriendo Drive.
    file.setDescription(JSON.stringify({
      archivo_id:   archivoId,
      owner_tipo:   'usuario',
      owner_id:     userId,
      proposito:    'avatar',
      subido_por:   userId,
      fecha_subida: new Date().toISOString(),
    }));

    // El sharing público se mantiene SOLO hasta REQ-MEDIA-001, que agrega el
    // endpoint getArchivo y hace que el frontend deje de usar la URL pública.
    // En ese REQ esta línea se elimina y se revoca el permiso.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId    = file.getId();
    const publicUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    // Modelo nuevo. Orden importante: primero se archiva el avatar anterior,
    // después se inserta el nuevo como activo. Así, si algo falla en el medio,
    // queda 0 avatares activos (el foto_url viejo sigue renderizando y se
    // autocorrige en la próxima subida) en vez de 2, que violaría la regla
    // "un solo avatar activo por usuario".
    archivarAvataresActivos(userId, archivoId);
    insertArchivo({
      archivoId:   archivoId,
      ownerTipo:   'usuario',
      ownerId:     userId,
      proposito:   'avatar',
      driveFileId: fileId,
      mimeType:    mimeType,
      tamanoBytes: bytes.length,
      subidoPor:   userId,
      estado:      'activo',
    });

    // Cache transitorio en Usuarios (avatar_archivo_id + foto_url).
    setAvatarEnUsuario(userId, archivoId, publicUrl);

    return respond(200, { success: true, fotoUrl: publicUrl, archivoId: archivoId });
  } catch (err) {
    // Sin binario en el log.
    Logger.log('Error al subir foto (usuario ' + userId + '): ' + err.toString());
    return respond(500, { error: 'Error al subir la imagen.' });
  }
}

// Escribe el avatar del usuario en la hoja Usuarios: avatar_archivo_id (modelo
// nuevo) y foto_url (cache transitorio). Uso interno — no es un endpoint.
function setAvatarEnUsuario(userId, archivoId, fotoUrl) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId     = h.indexOf('usuario_id');
  const iFoto   = h.indexOf('foto_url');
  const iAvatar = h.indexOf('avatar_archivo_id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] === userId) {
      if (iAvatar !== -1)              sheet.getRange(i + 1, iAvatar + 1).setValue(archivoId);
      if (iFoto !== -1 && fotoUrl)     sheet.getRange(i + 1, iFoto + 1).setValue(fotoUrl);
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------
// CATEGORÍAS
// ------------------------------------------------------------

// Una categoría "existe" (para el frontend y para las FK de Planes) solo si no
// está eliminada lógicamente. estado vacío = fila anterior a la auditoría = activa.
function categoriaEstaEliminada(estado) {
  return (estado || '').toString() === 'eliminada';
}

function handleGetCategorias(body) {
  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId    = h.indexOf('categoria_id');
  const iNom   = h.indexOf('nombre');
  const iColor = h.indexOf('color_hex');
  const iEst   = h.indexOf('estado');

  const categorias = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[iId]) continue;
    if (iEst !== -1 && categoriaEstaEliminada(row[iEst])) continue;

    categorias.push({
      categoriaId: row[iId],
      nombre:      row[iNom],
      colorHex:    row[iColor],
    });
  }

  return respond(200, { categorias });
}

function handleCreateCategoria(body) {
  const { nombre, colorHex, authUserId } = body;

  if (!nombre || !colorHex) {
    return respond(400, { error: 'Nombre y color requeridos.' });
  }

  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iNom  = h.indexOf('nombre');
  const iEst  = h.indexOf('estado');

  // Nombre único entre las categorías NO eliminadas: se puede reusar el nombre
  // de una categoría borrada.
  for (let i = 1; i < data.length; i++) {
    if (iEst !== -1 && categoriaEstaEliminada(data[i][iEst])) continue;
    if ((data[i][iNom] || '').toString().toLowerCase() === nombre.toLowerCase()) {
      return respond(409, { error: 'Ya existe una categoría con ese nombre.' });
    }
  }

  const categoriaId = 'cat_' + Date.now();
  const ahora       = new Date().toISOString();

  const fila = CATEGORIAS_HEADERS.map(col => {
    switch (col) {
      case 'categoria_id':       return categoriaId;
      case 'nombre':             return nombre;
      case 'color_hex':          return colorHex;
      case 'creado_por':         return authUserId || '';
      case 'fecha_creacion':     return ahora;
      case 'modificado_por':     return '';
      case 'fecha_modificacion': return '';
      case 'estado':             return 'activa';
      case 'eliminado_por':      return '';
      case 'fecha_eliminacion':  return '';
      default:                   return '';
    }
  });
  sheet.appendRow(fila);

  return respond(200, { success: true, categoriaId });
}

function handleUpdateCategoria(body) {
  const { categoriaId, nombre, colorHex, authUserId } = body;

  if (!categoriaId) return respond(400, { error: 'ID de categoría requerido.' });

  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('categoria_id');
  const iNom  = h.indexOf('nombre');
  const iCol  = h.indexOf('color_hex');
  const iEst  = h.indexOf('estado');
  const iMod  = h.indexOf('modificado_por');
  const iFMod = h.indexOf('fecha_modificacion');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] !== categoriaId) continue;
    if (iEst !== -1 && categoriaEstaEliminada(data[i][iEst])) break;  // eliminada -> 404

    if (nombre)   sheet.getRange(i + 1, iNom + 1).setValue(nombre);
    if (colorHex) sheet.getRange(i + 1, iCol + 1).setValue(colorHex);
    if (iMod  !== -1) sheet.getRange(i + 1, iMod  + 1).setValue(authUserId || '');
    if (iFMod !== -1) sheet.getRange(i + 1, iFMod + 1).setValue(new Date().toISOString());
    return respond(200, { success: true });
  }

  return respond(404, { error: 'Categoría no encontrada.' });
}

// Borrado lógico: la fila nunca se borra. Se marca estado='eliminada' con quién
// y cuándo. getCategorias deja de devolverla; se puede recuperar editando la
// planilla a mano.
function handleDeleteCategoria(body) {
  const { categoriaId, authUserId } = body;

  if (!categoriaId) return respond(400, { error: 'ID de categoría requerido.' });

  // No se puede eliminar si tiene al menos un plan NO eliminado que la usa.
  const planesSheet = getSheet(SHEETS.PLANES);
  const planesData  = planesSheet.getDataRange().getValues();
  const ph          = planesData[0];
  const iPCat       = ph.indexOf('categoria_id');
  const iPEst       = ph.indexOf('estado');
  for (let i = 1; i < planesData.length; i++) {
    if (planesData[i][iPCat] !== categoriaId) continue;
    if (iPEst !== -1 && planesData[i][iPEst] === 'eliminado') continue;
    return respond(409, {
      error: 'No se puede eliminar: hay planes que usan esta categoría.'
    });
  }

  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('categoria_id');
  const iNom  = h.indexOf('nombre');
  const iEst  = h.indexOf('estado');
  const iElim = h.indexOf('eliminado_por');
  const iFel  = h.indexOf('fecha_eliminacion');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] !== categoriaId) continue;
    if (iEst !== -1 && categoriaEstaEliminada(data[i][iEst])) break;  // ya eliminada -> 404

    const nombre = (data[i][iNom] || '').toString();
    if (iEst  !== -1) sheet.getRange(i + 1, iEst  + 1).setValue('eliminada');
    if (iElim !== -1) sheet.getRange(i + 1, iElim + 1).setValue(authUserId || '');
    if (iFel  !== -1) sheet.getRange(i + 1, iFel  + 1).setValue(new Date().toISOString());

    registrarAuditoria(authUserId, 'categoria.eliminar', 'Categorias', categoriaId, { nombre: nombre });
    return respond(200, { success: true });
  }

  return respond(404, { error: 'Categoría no encontrada.' });
}

// ------------------------------------------------------------
// PLANES
// Headers: ver PLANES_HEADERS. estado: pendiente | completado | eliminado.
// Los campos nuevos se leen/escriben por lookup de header (no por número de
// columna): las columnas de auditoría se agregaron al final y no queremos
// depender del orden físico.
// ------------------------------------------------------------

// Devuelve el índice de fila (1-based) de un plan NO eliminado, o -1.
// Además expone el header para que el caller resuelva columnas.
function buscarPlanActivo(sheet, planId) {
  const data = sheet.getDataRange().getValues();
  const h    = data[0];
  const iId  = h.indexOf('plan_id');
  const iEst = h.indexOf('estado');

  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] !== planId) continue;
    if (iEst !== -1 && data[i][iEst] === 'eliminado') return { rowIndex: -1, h: h, encontrado: true };
    return { rowIndex: i + 1, h: h, encontrado: true };
  }
  return { rowIndex: -1, h: h, encontrado: false };
}

function handleGetPlanes(body) {
  const sheet = getSheet(SHEETS.PLANES);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('plan_id');
  const iTit  = h.indexOf('titulo');
  const iCat  = h.indexOf('categoria_id');
  const iCre  = h.indexOf('creado_por');
  const iFCre = h.indexOf('fecha_creacion');
  const iFPro = h.indexOf('fecha_programada');
  const iFVen = h.indexOf('fecha_vencimiento');
  const iEst  = h.indexOf('estado');

  const planes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[iId]) continue;
    if (row[iEst] === 'eliminado') continue;

    planes.push({
      planId:           row[iId],
      titulo:           row[iTit],
      categoriaId:      row[iCat] || null,
      creadoPor:        row[iCre],
      fechaCreacion:    formatDate(row[iFCre]),
      fechaProgramada:  formatDate(row[iFPro]),
      fechaVencimiento: row[iFVen] ? formatDate(row[iFVen]) : null,
      estado:           row[iEst],
    });
  }

  return respond(200, { planes });
}

function handleCreatePlan(body) {
  const { titulo, categoriaId, userId, fechaProgramada, fechaVencimiento } = body;

  if (!titulo || !userId || !fechaProgramada) {
    return respond(400, { error: 'Título, usuario y fecha programada son requeridos.' });
  }

  // Validar que la categoría existe (y no está eliminada) solo si se proporcionó
  if (categoriaId && !categoriaExists(categoriaId)) {
    return respond(404, { error: 'La categoría indicada no existe.' });
  }

  if (!userExists(userId)) {
    return respond(404, { error: 'Usuario no encontrado.' });
  }

  const planId = 'plan_' + Date.now();
  const ahora  = new Date().toISOString();  // timestamp de sistema en ISO 8601 UTC

  const sheet = getSheet(SHEETS.PLANES);
  const fila = PLANES_HEADERS.map(col => {
    switch (col) {
      case 'plan_id':            return planId;
      case 'titulo':             return titulo;
      case 'categoria_id':       return categoriaId || '';
      case 'creado_por':         return userId;
      case 'fecha_creacion':     return ahora;
      case 'fecha_programada':   return new Date(fechaProgramada);
      case 'fecha_vencimiento':  return fechaVencimiento ? new Date(fechaVencimiento) : '';
      case 'estado':             return 'pendiente';
      case 'modificado_por':     return '';
      case 'fecha_modificacion': return '';
      case 'eliminado_por':      return '';
      case 'fecha_eliminacion':  return '';
      default:                   return '';
    }
  });
  sheet.appendRow(fila);

  return respond(200, { success: true, planId });
}

function handleUpdatePlan(body) {
  const { planId, titulo, categoriaId, fechaProgramada, fechaVencimiento, authUserId } = body;

  if (!planId) return respond(400, { error: 'ID de plan requerido.' });

  const sheet = getSheet(SHEETS.PLANES);
  const { rowIndex, h } = buscarPlanActivo(sheet, planId);
  if (rowIndex === -1) return respond(404, { error: 'Plan no encontrado.' });

  const col = name => h.indexOf(name) + 1;  // 1-based; 0 si no existe

  if (titulo) sheet.getRange(rowIndex, col('titulo')).setValue(titulo);

  if (categoriaId !== undefined) {
    if (categoriaId && !categoriaExists(categoriaId)) {
      return respond(404, { error: 'La categoría indicada no existe.' });
    }
    sheet.getRange(rowIndex, col('categoria_id')).setValue(categoriaId || '');
  }

  if (fechaProgramada) {
    sheet.getRange(rowIndex, col('fecha_programada')).setValue(new Date(fechaProgramada));
  }
  if (fechaVencimiento !== undefined) {
    sheet.getRange(rowIndex, col('fecha_vencimiento'))
      .setValue(fechaVencimiento ? new Date(fechaVencimiento) : '');
  }

  if (col('modificado_por'))     sheet.getRange(rowIndex, col('modificado_por')).setValue(authUserId || '');
  if (col('fecha_modificacion')) sheet.getRange(rowIndex, col('fecha_modificacion')).setValue(new Date().toISOString());

  return respond(200, { success: true });
}

function handleCompletePlan(body) {
  const { planId, authUserId } = body;

  if (!planId) return respond(400, { error: 'ID de plan requerido.' });

  const sheet = getSheet(SHEETS.PLANES);
  const { rowIndex, h } = buscarPlanActivo(sheet, planId);
  if (rowIndex === -1) return respond(404, { error: 'Plan no encontrado.' });

  const col = name => h.indexOf(name) + 1;

  sheet.getRange(rowIndex, col('estado')).setValue('completado');
  if (col('modificado_por'))     sheet.getRange(rowIndex, col('modificado_por')).setValue(authUserId || '');
  if (col('fecha_modificacion')) sheet.getRange(rowIndex, col('fecha_modificacion')).setValue(new Date().toISOString());

  return respond(200, { success: true });
}

// Borrado lógico: la fila nunca se borra. estado='eliminado' (se pierde el
// estado previo pendiente/completado, aceptado en REQ-DATA-002).
function handleDeletePlan(body) {
  const { planId, authUserId } = body;

  if (!planId) return respond(400, { error: 'ID de plan requerido.' });

  const sheet = getSheet(SHEETS.PLANES);
  const { rowIndex, h } = buscarPlanActivo(sheet, planId);
  if (rowIndex === -1) return respond(404, { error: 'Plan no encontrado.' });

  const col   = name => h.indexOf(name) + 1;
  const data  = sheet.getDataRange().getValues();
  const iTit  = h.indexOf('titulo');
  const titulo = (data[rowIndex - 1][iTit] || '').toString();

  sheet.getRange(rowIndex, col('estado')).setValue('eliminado');
  if (col('eliminado_por'))     sheet.getRange(rowIndex, col('eliminado_por')).setValue(authUserId || '');
  if (col('fecha_eliminacion')) sheet.getRange(rowIndex, col('fecha_eliminacion')).setValue(new Date().toISOString());

  registrarAuditoria(authUserId, 'plan.eliminar', 'Planes', planId, { titulo: titulo });
  return respond(200, { success: true });
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

// Seam de testing (Tests.gs / probarDATA002). En producción SIEMPRE es null y
// toda la lógica trabaja contra SPREADSHEET_ID (Script Properties). Tests.gs lo
// apunta a una planilla scratch mientras corre y lo vuelve a null al terminar.
// Cada invocación de Apps Script tiene su propio estado global, así que un
// request del Web App no puede ver este override.
var TEST_SPREADSHEET_ID_OVERRIDE = null;

// Planilla de datos activa. Única puerta de acceso: nadie abre por ID suelto.
function abrirPlanilla() {
  return SpreadsheetApp.openById(TEST_SPREADSHEET_ID_OVERRIDE || SPREADSHEET_ID);
}

function getSheet(sheetName) {
  const ss = abrirPlanilla();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Hoja "${sheetName}" no encontrada.`);
  return sheet;
}

function respond(statusCode, data) {
  const payload = JSON.stringify({ status: statusCode, ...data });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  // Sheets a veces devuelve strings con formato no-ISO — intentamos parsear como Date
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

// Una categoría eliminada lógicamente no "existe" para las FK de Planes.
function categoriaExists(categoriaId) {
  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('categoria_id');
  const iEst  = h.indexOf('estado');
  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] !== categoriaId) continue;
    if (iEst !== -1 && categoriaEstaEliminada(data[i][iEst])) return false;
    return true;
  }
  return false;
}

function userExists(userId) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) return true;
  }
  return false;
}

// ------------------------------------------------------------
// IDs
// ------------------------------------------------------------

// ID ordenable cronológicamente (base36 del timestamp) + sufijo aleatorio
// anti-colisión de 6 caracteres (~2.000 millones de combinaciones, suficiente
// para descartar colisiones aunque se generen muchos IDs en el mismo
// milisegundo). Ej: newId('arc') -> 'arc_m8x2k1p9_7f3a2c'.
// Los IDs viejos ('cat_' + Date.now(), 'plan_' + ...) no se migran.
function newId(prefijo) {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return prefijo + '_' + ts + '_' + rnd;
}

// ------------------------------------------------------------
// ARCHIVOS — acceso a la hoja Archivos
// Esquema y reglas en docs/modelo-datos.md sección 4.
// Las FKs no las hace cumplir Sheets: se validan acá en código.
// ------------------------------------------------------------

// Inserta una fila en Archivos. Campos en camelCase; el server completa
// archivo_id (si no viene), fecha_subida y fecha_modificacion.
// Devuelve el archivo_id.
function insertArchivo(fields) {
  const sheet     = getSheet(SHEETS.ARCHIVOS);
  const ahora     = new Date().toISOString();
  const archivoId = fields.archivoId || newId('arc');

  const valores = ARCHIVOS_HEADERS.map(col => {
    switch (col) {
      case 'archivo_id':         return archivoId;
      case 'owner_tipo':         return fields.ownerTipo;
      case 'owner_id':           return fields.ownerId || '';
      case 'proposito':          return fields.proposito;
      case 'titulo':             return fields.titulo || '';
      case 'fecha_contenido':    return fields.fechaContenido || ahora.split('T')[0];
      case 'drive_file_id':      return fields.driveFileId;
      case 'mime_type':          return fields.mimeType || '';
      case 'tamano_bytes':       return fields.tamanoBytes != null ? fields.tamanoBytes : '';
      case 'subido_por':         return fields.subidoPor || '';
      case 'fecha_subida':       return ahora;
      case 'modificado_por':     return '';
      case 'fecha_modificacion': return ahora;
      case 'estado':             return fields.estado || 'activo';
      case 'eliminado_por':      return '';
      case 'fecha_eliminacion':  return '';
      default:                   return '';
    }
  });

  sheet.appendRow(valores);
  return archivoId;
}

// Devuelve la fila de Archivos como objeto {header: valor, _rowIndex}, o null.
function getArchivoRow(archivoId) {
  const sheet = getSheet(SHEETS.ARCHIVOS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === archivoId) {
      const obj = { _rowIndex: i + 1 };
      h.forEach((col, j) => { obj[col] = data[i][j]; });
      return obj;
    }
  }
  return null;
}

function archivoExists(archivoId) {
  return getArchivoRow(archivoId) !== null;
}

// Devuelve el archivo_id del avatar 'activo' de un usuario, o null.
function buscarAvatarActivo(usuarioId) {
  const sheet = getSheet(SHEETS.ARCHIVOS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId      = h.indexOf('archivo_id');
  const iOwnerT  = h.indexOf('owner_tipo');
  const iOwnerId = h.indexOf('owner_id');
  const iProp    = h.indexOf('proposito');
  const iEstado  = h.indexOf('estado');

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[iOwnerT] === 'usuario' && r[iOwnerId] === usuarioId &&
        r[iProp] === 'avatar'    && r[iEstado] === 'activo') {
      return r[iId];
    }
  }
  return null;
}

// Marca como 'archivado' todos los avatares 'activo' de un usuario, salvo el
// que se pasa en exceptoArchivoId. Mantiene la regla "un solo avatar activo
// por usuario".
function archivarAvataresActivos(usuarioId, exceptoArchivoId) {
  const sheet = getSheet(SHEETS.ARCHIVOS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId      = h.indexOf('archivo_id');
  const iOwnerT  = h.indexOf('owner_tipo');
  const iOwnerId = h.indexOf('owner_id');
  const iProp    = h.indexOf('proposito');
  const iEstado  = h.indexOf('estado');
  const iMod     = h.indexOf('fecha_modificacion');
  const ahora    = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[iOwnerT] === 'usuario' && r[iOwnerId] === usuarioId &&
        r[iProp] === 'avatar'    && r[iEstado] === 'activo'   &&
        r[iId] !== exceptoArchivoId) {
      sheet.getRange(i + 1, iEstado + 1).setValue('archivado');
      sheet.getRange(i + 1, iMod + 1).setValue(ahora);
    }
  }
}

// Extrae el ID de archivo de Drive de una URL. Soporta los formatos que la app
// pudo haber guardado en foto_url.
function extraerDriveFileId(url) {
  const s = (url || '').toString();
  const porQuery = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);       // thumbnail?id=, uc?id=
  if (porQuery) return porQuery[1];
  const porPath = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);    // /file/d/<ID>/view
  if (porPath) return porPath[1];
  return null;
}

// ------------------------------------------------------------
// AUDITORIA (REQ-DATA-002)
// Log liviano de accesos y cambios sensibles. La app maneja datos personales
// (Ley 25.326). Escribir en el log NUNCA debe romper la operación principal:
// si el append falla, se loguea y se sigue.
// ------------------------------------------------------------

// Serializa Auditoria.detalle. Tres capas de defensa (revisión de Julia):
//  1. Allowlist de claves: nada de token/token_hash/secreto/google_sub/binario
//     aunque el que llama lo pase.
//  2. Los valores se fuerzan a primitivo (string/number/boolean). Un objeto o
//     array anidado se descarta: no se puede filtrar data por la forma del valor.
//  3. El resultado es SIEMPRE un JSON entre llaves, así que la celda nunca
//     empieza con = + - @ → no se interpreta como fórmula al abrir la planilla
//     (anti CSV / formula injection).
// Objeto vacío -> ''. Excede 500 chars -> {"_truncado":true}.
function sanitizarDetalleAuditoria(detalle) {
  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) return '';

  const limpio = {};
  Object.keys(detalle).forEach(clave => {
    if (AUDITORIA_DETALLE_CLAVES_OK.indexOf(clave) === -1) return;
    const valor = detalle[clave];
    const tipo  = typeof valor;
    if (tipo !== 'string' && tipo !== 'number' && tipo !== 'boolean') return;
    if (valor === '') return;
    limpio[clave] = valor;
  });

  const json = JSON.stringify(limpio);
  if (json === '{}') return '';
  if (json.length > 500) return JSON.stringify({ _truncado: true });
  return json;
}

// Enmascara un email para el log: guarda lo justo para detectar reintentos del
// mismo origen sin almacenar el dato personal completo de un tercero que no es
// usuario del sistema (Ley 25.326). fran@example.com -> f***@example.com
function enmascararEmail(email) {
  const s  = (email || '').toString();
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return s[0] + '***' + s.slice(at);
}

// Escribe una fila en Auditoria. Fallo silencioso: si la hoja no existe o el
// append tira, queda en Logger.log y la operación que llamó sigue normal.
//
// Hace flush() después del append: la fila no puede quedar como escritura
// pendiente. Si quedara pendiente, se flushearía recién al terminar la
// ejecución —después de devolver la respuesta HTTP— y colisionaría con la
// request siguiente del frontend sobre la misma planilla (ver el bug de la
// pantalla negra post-login: getCategorias/getPlanes colgados 30 s -> 404).
function registrarAuditoria(usuarioId, accion, entidad, entidadId, detalle) {
  try {
    const sheet = getSheet(SHEETS.AUDITORIA);
    const fila = AUDITORIA_HEADERS.map(col => {
      switch (col) {
        case 'fecha':      return new Date().toISOString();
        case 'usuario_id': return (usuarioId || '').toString();
        case 'accion':     return (accion || '').toString();
        case 'entidad':    return (entidad || '').toString();
        case 'entidad_id': return (entidadId || '').toString();
        case 'detalle':    return sanitizarDetalleAuditoria(detalle);
        default:           return '';
      }
    });
    sheet.appendRow(fila);
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log('registrarAuditoria falló (accion=' + accion + '): ' + err.toString());
  }
}

// ------------------------------------------------------------
// SETUP INICIAL — Correr una sola vez para crear las hojas
// ------------------------------------------------------------

function setupSheets() {
  const ss = abrirPlanilla();

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
    return sheet;
  }

  // Agrega una columna al final si el header no existe. Nunca inserta ni
  // reordena columnas: los datos existentes no se tocan.
  function ensureColumn(sheet, headerName) {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.indexOf(headerName) !== -1) return;
    sheet.getRange(1, lastCol + 1).setValue(headerName);
  }

  const usuarios = ensureSheet(SHEETS.USUARIOS,
    ['usuario_id', 'nombre_display', 'email', 'google_sub', 'foto_url']);
  ensureColumn(usuarios, 'avatar_archivo_id');

  // Categorias y Planes: hoja base con el esquema histórico; las columnas de
  // auditoría (REQ-DATA-002) se agregan al final con ensureColumn, sin tocar
  // los datos existentes. En una planilla nueva el resultado es idéntico a
  // crear la hoja con CATEGORIAS_HEADERS / PLANES_HEADERS de una.
  const categorias = ensureSheet(SHEETS.CATEGORIAS, ['categoria_id', 'nombre', 'color_hex']);
  CATEGORIAS_HEADERS.forEach(col => ensureColumn(categorias, col));

  const planes = ensureSheet(SHEETS.PLANES,
    ['plan_id', 'titulo', 'categoria_id', 'creado_por',
     'fecha_creacion', 'fecha_programada', 'fecha_vencimiento', 'estado']);
  PLANES_HEADERS.forEach(col => ensureColumn(planes, col));

  ensureSheet(SHEETS.ARCHIVOS,  ARCHIVOS_HEADERS);
  ensureSheet(SHEETS.SESIONES,  SESIONES_HEADERS);
  ensureSheet(SHEETS.AUDITORIA, AUDITORIA_HEADERS);

  Logger.log('Hojas creadas/actualizadas correctamente.');
}

// ------------------------------------------------------------
// MIGRACIÓN REQ-DATA-001 — Correr una sola vez, después de setupSheets().
// Por cada usuario con foto_url, crea su fila en Archivos y setea
// avatar_archivo_id. Idempotente: si el usuario ya tiene avatar_archivo_id,
// lo saltea. No toca Drive ni el sharing de los archivos.
// ------------------------------------------------------------

function migrarAvataresAArchivos() {
  const uSheet = getSheet(SHEETS.USUARIOS);
  const uData  = uSheet.getDataRange().getValues();
  const h      = uData[0];
  const iUsuarioId = h.indexOf('usuario_id');
  const iFotoUrl   = h.indexOf('foto_url');
  const iAvatarId  = h.indexOf('avatar_archivo_id');

  if (iAvatarId === -1) {
    throw new Error('Falta la columna avatar_archivo_id en Usuarios. Corré setupSheets() primero.');
  }

  let creados = 0, yaMigrados = 0, reparados = 0, saltados = 0, sinFoto = 0;

  for (let i = 1; i < uData.length; i++) {
    const row       = uData[i];
    const usuarioId = row[iUsuarioId];
    if (!usuarioId) continue;

    if (row[iAvatarId]) { yaMigrados++; continue; }              // idempotencia

    const fotoUrl = (row[iFotoUrl] || '').toString().trim();
    if (!fotoUrl) { sinFoto++; continue; }

    // Recuperación: si una corrida previa creó la fila en Archivos pero murió
    // antes de escribir avatar_archivo_id, reusamos esa fila en vez de
    // duplicarla (F2).
    const existente = buscarAvatarActivo(usuarioId);
    if (existente) {
      uSheet.getRange(i + 1, iAvatarId + 1).setValue(existente);
      reparados++;
      continue;
    }

    const fileId = extraerDriveFileId(fotoUrl);
    if (!fileId) {
      Logger.log('migrarAvatares: no se pudo extraer file ID de la foto del usuario ' +
                 usuarioId + '. Se salta.');
      saltados++;
      continue;
    }

    const archivoId = insertArchivo({
      ownerTipo:   'usuario',
      ownerId:     usuarioId,
      proposito:   'avatar',
      driveFileId: fileId,
      subidoPor:   usuarioId,
      estado:      'activo',
    });
    uSheet.getRange(i + 1, iAvatarId + 1).setValue(archivoId);
    creados++;
  }

  const resumen = { creados, yaMigrados, reparados, saltados, sinFoto };
  Logger.log('migrarAvatares: ' + JSON.stringify(resumen));
  return resumen;
}

// ------------------------------------------------------------
// BACKFILL REQ-DATA-002 — Correr una sola vez, después de setupSheets().
// Deja todas las filas existentes de Categorias con estado='activa' (las que
// no tienen valor: son anteriores a la auditoría). No inventa creado_por ni
// fecha_creacion (no hay dato de origen) y NO toca Planes.estado (ya viene
// poblado). Idempotente: segunda corrida -> actualizados=0.
// ------------------------------------------------------------

function backfillAuditoriaCategoriasPlanes() {
  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const iId   = h.indexOf('categoria_id');
  const iEst  = h.indexOf('estado');

  if (iEst === -1) {
    throw new Error('Falta la columna estado en Categorias. Corré setupSheets() primero.');
  }

  let actualizados = 0, yaTenian = 0, vacias = 0;

  for (let i = 1; i < data.length; i++) {
    if (!data[i][iId]) { vacias++; continue; }
    if ((data[i][iEst] || '').toString() !== '') { yaTenian++; continue; }
    sheet.getRange(i + 1, iEst + 1).setValue('activa');
    actualizados++;
  }

  const resumen = { actualizados, yaTenian, vacias };
  Logger.log('backfillAuditoriaCategoriasPlanes: ' + JSON.stringify(resumen));
  return resumen;
}

// ------------------------------------------------------------
// SETUP CONFIG — Correr una sola vez para cargar Script Properties.
// Reemplazar los valores y ejecutar. Después borrar los valores de acá
// (quedan guardados en Project Settings > Script Properties).
// SESSION_SECRET: generar un string aleatorio largo (ej. 40+ caracteres).
// ------------------------------------------------------------

function setupConfig() {
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID:  'REEMPLAZAR',
    DRIVE_FOLDER_ID: 'REEMPLAZAR',
    OAUTH_CLIENT_ID: 'REEMPLAZAR.apps.googleusercontent.com',
    SESSION_SECRET:  'REEMPLAZAR_CON_STRING_ALEATORIO_LARGO',
  }, false);

  Logger.log('Config cargada. Borrá los valores de esta función.');
}

// Los usuarios se administran a mano en la hoja Usuarios:
//   usuario_id | nombre_display | email | google_sub | foto_url
// Para agregar a alguien: fila nueva con su email + agregarlo como
// usuario de prueba en la pantalla de consentimiento de Google Cloud.
// Para darlo de baja: borrar su fila.
