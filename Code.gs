// ============================================================
// COUPLE PLANS — Google Apps Script Backend
// Modelo de datos: Google Sheets
// Hojas requeridas: Usuarios, Categorias, Planes
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
      case 'updateAvatar':    return handleUpdateAvatar(body);
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

function handleUpdateAvatar(body) {
  const { userId, fotoUrl } = body;

  if (!fotoUrl) return respond(400, { error: 'URL de foto requerida.' });

  const sheet = getSheet(SHEETS.USUARIOS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i + 1, 5).setValue(fotoUrl); // columna 5 = foto_url
      return respond(200, { success: true, fotoUrl });
    }
  }

  return respond(404, { error: 'Usuario no encontrado.' });
}

function handleUploadPhoto(body) {
  const { userId, fileBase64, mimeType } = body;

  if (!fileBase64 || !mimeType) {
    return respond(400, { error: 'Archivo y tipo MIME requeridos.' });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    return respond(400, { error: 'Tipo de archivo no permitido. Solo JPG, PNG o WEBP.' });
  }

  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileBase64),
      mimeType,
      `avatar_${userId}_${Date.now()}`
    );

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    // La URL uc?export=view fue bloqueada por Google para hotlinking desde externos.
    // La URL de thumbnail (sz=w400) es pública para archivos compartidos con "anyone with link"
    // y funciona correctamente como src de <img>.
    const publicUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    // Actualizar URL en Sheets
    const updateBody = { ...body, fotoUrl: publicUrl };
    handleUpdateAvatar(updateBody);

    return respond(200, { success: true, fotoUrl: publicUrl });
  } catch (err) {
    Logger.log('Error al subir foto: ' + err.toString());
    return respond(500, { error: 'Error al subir la imagen.' });
  }
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

  ensureSheet(SHEETS.USUARIOS,   ['usuario_id', 'nombre_display', 'email', 'google_sub', 'foto_url']);
  ensureSheet(SHEETS.CATEGORIAS, ['categoria_id', 'nombre', 'color_hex']);
  ensureSheet(SHEETS.PLANES,     ['plan_id', 'titulo', 'categoria_id', 'creado_por',
                                   'fecha_creacion', 'fecha_programada', 'fecha_vencimiento', 'estado']);

  Logger.log('Hojas creadas correctamente.');
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
