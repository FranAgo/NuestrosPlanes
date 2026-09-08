// ============================================================
// COUPLE PLANS — Google Apps Script Backend
// Modelo de datos: Google Sheets
// Hojas requeridas: Usuarios, Categorias, Planes, Archivos
// Diseño del modelo: docs/modelo-datos.md
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
};

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

// ------------------------------------------------------------
// ENTRY POINT — Router principal
// ------------------------------------------------------------

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // Endpoints que NO requieren sesión válida
    const publicActions = ['loginGoogle'];

    if (!publicActions.includes(action)) {
      const sessionError = validateSession(body.sessionToken, body.userId);
      if (sessionError) return respond(401, { error: sessionError });
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
// AUTENTICACIÓN
// ------------------------------------------------------------

// Login con Google Sign-In.
// El frontend obtiene un ID token de Google y lo manda acá.
// Verificamos el token contra Google, y solo dejamos entrar a los emails
// que estén cargados en la hoja Usuarios (lista blanca).
// No se almacena ni se compara ninguna contraseña.
function handleLoginGoogle(body) {
  const { idToken } = body;

  if (!idToken) {
    return respond(400, { error: 'Token de Google requerido.' });
  }
  if (!OAUTH_CLIENT_ID || !SESSION_SECRET) {
    Logger.log('Falta configurar OAUTH_CLIENT_ID o SESSION_SECRET en Script Properties.');
    return respond(500, { error: 'Autenticación no configurada en el servidor.' });
  }

  const payload = verifyGoogleIdToken(idToken);
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
      const sessionToken = generateSessionToken(userId);

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

  return respond(403, { error: 'Cuenta no autorizada para esta aplicación.' });
}

// Verifica el ID token contra el endpoint oficial de Google.
// Google valida la firma; nosotros validamos que el token sea para NUESTRA app.
function verifyGoogleIdToken(idToken) {
  try {
    const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;

    const payload = JSON.parse(res.getContentText());

    // El token tiene que haber sido emitido para nuestro Client ID.
    if (payload.aud !== OAUTH_CLIENT_ID) return null;

    // Emisor esperado.
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      return null;
    }

    // No vencido (con 5 min de tolerancia de reloj).
    if (payload.exp && (Number(payload.exp) * 1000) < (Date.now() - 5 * 60 * 1000)) {
      return null;
    }

    return payload;
  } catch (err) {
    Logger.log('verifyGoogleIdToken error: ' + err.toString());
    return null;
  }
}

// ------------------------------------------------------------
// VALIDACIÓN DE SESIÓN
// Valida que el token corresponde al userId declarado.
// El token es SHA-256(userId + SESSION_SECRET).
// Es stateless: no requiere almacenar sesiones en Sheets.
// ------------------------------------------------------------

function generateSessionToken(userId) {
  return hashString(userId + SESSION_SECRET);
}

function validateSession(sessionToken, userId) {
  if (!sessionToken || !userId) return 'Sesión requerida.';
  const expected = generateSessionToken(userId);
  if (sessionToken !== expected) return 'Sesión inválida.';
  return null; // sin error
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

function handleGetCategorias(body) {
  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();
  const categorias = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      categorias.push({
        categoriaId: row[0],
        nombre:      row[1],
        colorHex:    row[2],
      });
    }
  }

  return respond(200, { categorias });
}

function handleCreateCategoria(body) {
  const { nombre, colorHex } = body;

  if (!nombre || !colorHex) {
    return respond(400, { error: 'Nombre y color requeridos.' });
  }

  // Verificar nombre único
  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString().toLowerCase() === nombre.toLowerCase()) {
      return respond(409, { error: 'Ya existe una categoría con ese nombre.' });
    }
  }

  const categoriaId = 'cat_' + Date.now();
  sheet.appendRow([categoriaId, nombre, colorHex]);

  return respond(200, { success: true, categoriaId });
}

function handleUpdateCategoria(body) {
  const { categoriaId, nombre, colorHex } = body;

  if (!categoriaId) return respond(400, { error: 'ID de categoría requerido.' });

  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === categoriaId) {
      if (nombre)    sheet.getRange(i + 1, 2).setValue(nombre);
      if (colorHex)  sheet.getRange(i + 1, 3).setValue(colorHex);
      return respond(200, { success: true });
    }
  }

  return respond(404, { error: 'Categoría no encontrada.' });
}

function handleDeleteCategoria(body) {
  const { categoriaId } = body;

  if (!categoriaId) return respond(400, { error: 'ID de categoría requerido.' });

  // Verificar que no haya planes asociados
  const planesSheet = getSheet(SHEETS.PLANES);
  const planesData = planesSheet.getDataRange().getValues();
  for (let i = 1; i < planesData.length; i++) {
    if (planesData[i][2] === categoriaId) {
      return respond(409, {
        error: 'No se puede eliminar: hay planes que usan esta categoría.'
      });
    }
  }

  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === categoriaId) {
      sheet.deleteRow(i + 1);
      return respond(200, { success: true });
    }
  }

  return respond(404, { error: 'Categoría no encontrada.' });
}

// ------------------------------------------------------------
// PLANES
// Headers: [plan_id, titulo, categoria_id, creado_por,
//           fecha_creacion, fecha_programada, fecha_vencimiento, estado]
// ------------------------------------------------------------

function handleGetPlanes(body) {
  const sheet = getSheet(SHEETS.PLANES);
  const data = sheet.getDataRange().getValues();
  const planes = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    planes.push({
      planId:           row[0],
      titulo:           row[1],
      categoriaId:      row[2] || null,
      creadoPor:        row[3],
      fechaCreacion:    formatDate(row[4]),
      fechaProgramada:  formatDate(row[5]),
      fechaVencimiento: row[6] ? formatDate(row[6]) : null,
      estado:           row[7],
    });
  }

  return respond(200, { planes });
}

function handleCreatePlan(body) {
  const { titulo, categoriaId, userId, fechaProgramada, fechaVencimiento } = body;

  if (!titulo || !userId || !fechaProgramada) {
    return respond(400, { error: 'Título, usuario y fecha programada son requeridos.' });
  }

  // Validar que la categoría existe solo si se proporcionó una
  if (categoriaId && !categoriaExists(categoriaId)) {
    return respond(404, { error: 'La categoría indicada no existe.' });
  }

  // Validar que el usuario existe
  if (!userExists(userId)) {
    return respond(404, { error: 'Usuario no encontrado.' });
  }

  const planId = 'plan_' + Date.now();
  const fechaCreacion = new Date();

  const sheet = getSheet(SHEETS.PLANES);
  sheet.appendRow([
    planId,
    titulo,
    categoriaId,
    userId,
    fechaCreacion,
    new Date(fechaProgramada),
    fechaVencimiento ? new Date(fechaVencimiento) : '',
    'pendiente',
  ]);

  return respond(200, { success: true, planId });
}

function handleUpdatePlan(body) {
  const { planId, titulo, categoriaId, fechaProgramada, fechaVencimiento } = body;

  if (!planId) return respond(400, { error: 'ID de plan requerido.' });

  const sheet = getSheet(SHEETS.PLANES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === planId) {
      if (titulo)                      sheet.getRange(i + 1, 2).setValue(titulo);
      if (categoriaId !== undefined) {
        if (categoriaId && !categoriaExists(categoriaId)) {
          return respond(404, { error: 'La categoría indicada no existe.' });
        }
        sheet.getRange(i + 1, 3).setValue(categoriaId || '');
      }
      if (fechaProgramada)             sheet.getRange(i + 1, 6).setValue(new Date(fechaProgramada));
      if (fechaVencimiento !== undefined) {
        sheet.getRange(i + 1, 7).setValue(
          fechaVencimiento ? new Date(fechaVencimiento) : ''
        );
      }
      return respond(200, { success: true });
    }
  }

  return respond(404, { error: 'Plan no encontrado.' });
}

function handleCompletePlan(body) {
  const { planId } = body;

  if (!planId) return respond(400, { error: 'ID de plan requerido.' });

  const sheet = getSheet(SHEETS.PLANES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === planId) {
      sheet.getRange(i + 1, 8).setValue('completado'); // columna 8 = estado
      return respond(200, { success: true });
    }
  }

  return respond(404, { error: 'Plan no encontrado.' });
}

function handleDeletePlan(body) {
  const { planId } = body;

  if (!planId) return respond(400, { error: 'ID de plan requerido.' });

  const sheet = getSheet(SHEETS.PLANES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === planId) {
      sheet.deleteRow(i + 1);
      return respond(200, { success: true });
    }
  }

  return respond(404, { error: 'Plan no encontrado.' });
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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

function hashString(input) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  return rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  // Sheets a veces devuelve strings con formato no-ISO — intentamos parsear como Date
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

function categoriaExists(categoriaId) {
  const sheet = getSheet(SHEETS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === categoriaId) return true;
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
// SETUP INICIAL — Correr una sola vez para crear las hojas
// ------------------------------------------------------------

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

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

  ensureSheet(SHEETS.CATEGORIAS, ['categoria_id', 'nombre', 'color_hex']);
  ensureSheet(SHEETS.PLANES,     ['plan_id', 'titulo', 'categoria_id', 'creado_por',
                                   'fecha_creacion', 'fecha_programada', 'fecha_vencimiento', 'estado']);
  ensureSheet(SHEETS.ARCHIVOS,   ARCHIVOS_HEADERS);

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
