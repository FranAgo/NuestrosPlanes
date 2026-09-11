// ============================================================
// Tests.gs — Pruebas server-side. NO forma parte del runtime de la app:
// ninguna función de acá está en el router (doPost) ni en un trigger.
//
// probarDATA002()  — verifica REQ-DATA-002 contra Google Sheets REAL, sobre una
//                    planilla scratch que la propia función crea y borra.
//
// Uso (Roy):  clasp push -f -P .clasp-test.json
//             clasp run probarDATA002 -P .clasp-test.json
//
// Devuelve un objeto JSON { req, total, ok, fail, veredicto, detalles, notas }
// para poder leer el resultado desde la terminal sin abrir el editor.
//
// Depende del seam TEST_SPREADSHEET_ID_OVERRIDE definido en Code.gs (en prod es
// siempre null). Esta función lo apunta a la planilla scratch mientras corre y
// lo restaura en el finally, pase lo que pase.
//
// Fuera de alcance de probarDATA002 (se cubren aparte):
//   - 'login_denegado': requiere un access token real de Google. Cubierto por el
//     harness de Node + un smoke manual de login en test. (El login OK ya no
//     escribe en Auditoria: queda registrado en la hoja Sesiones.)
//   - Subida de avatar: requiere Drive + binario base64. Sin regresión esperada
//     (REQ-DATA-002 no toca handleUploadPhoto).
// ============================================================

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function probarDATA002() {
  const R = nuevoReporte('REQ-DATA-002');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarDATA002 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);

    sembrarEstadoLegacy(ss);

    grupoSetup(R);
    grupoBackfill(R);
    grupoCamposAuditoria(R);
    grupoPlanesISO(R);
    grupoBorradoLogico(R);
    grupoAuditoria(R);
    grupoFalloSilencioso(R);
    grupoSanitizar(R);
    grupoRegresion(R);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    if (scratchId) {
      try {
        DriveApp.getFileById(scratchId).setTrashed(true);
      } catch (e) {
        R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e);
      }
    }
  }

  return R.finalizar();
}

// ------------------------------------------------------------
// Fixture: planilla en el estado "pre-REQ-DATA-002" (como producción hoy)
// ------------------------------------------------------------

function sembrarEstadoLegacy(ss) {
  const usuarios = ss.insertSheet('Usuarios');
  usuarios.appendRow(['usuario_id', 'nombre_display', 'email', 'google_sub', 'foto_url', 'avatar_archivo_id']);
  usuarios.appendRow(['usr_fran', 'Fran', 'fran@test.local', 'sub-fran', '', '']);
  usuarios.appendRow(['usr_noe',  'Noe',  'noe@test.local',  'sub-noe',  '', '']);

  // Categorias con el esquema histórico de 3 columnas.
  const categorias = ss.insertSheet('Categorias');
  categorias.appendRow(['categoria_id', 'nombre', 'color_hex']);
  categorias.appendRow(['cat_cine',   'Cine',   '#e11d48']);
  categorias.appendRow(['cat_comida', 'Comida', '#16a34a']);

  // Planes con el esquema histórico de 8 columnas y fecha_creacion como fecha
  // NATIVA de Sheets (así probamos que formatDate sigue leyendo lo viejo).
  const planes = ss.insertSheet('Planes');
  planes.appendRow(['plan_id', 'titulo', 'categoria_id', 'creado_por',
                    'fecha_creacion', 'fecha_programada', 'fecha_vencimiento', 'estado']);
  planes.appendRow(['plan_peli', 'Ver peli', 'cat_cine', 'usr_fran',
                    new Date('2026-09-01'), new Date('2026-09-15'), '', 'pendiente']);

  // Sacar la hoja default que crea SpreadsheetApp.create().
  const nombresMios = ['Usuarios', 'Categorias', 'Planes'];
  ss.getSheets().forEach(sh => {
    if (nombresMios.indexOf(sh.getName()) === -1) ss.deleteSheet(sh);
  });
  SpreadsheetApp.flush();
}

// ------------------------------------------------------------
// Grupos de verificación (criterios de REQ-DATA-002)
// ------------------------------------------------------------

// Criterios 1 y 2 — setupSheets agrega columnas al final, sin perder datos, y
// crea Auditoria. Idempotente.
function grupoSetup(R) {
  setupSheets();

  R.eq('C1 · Categorias tiene el esquema completo',
       headersDe('Categorias').join(','), CATEGORIAS_HEADERS.join(','));
  R.eq('C1 · Planes tiene el esquema completo',
       headersDe('Planes').join(','), PLANES_HEADERS.join(','));
  R.eq('C2 · Auditoria creada con los 6 headers',
       headersDe('Auditoria').join(','), AUDITORIA_HEADERS.join(','));

  R.eq('C1 · dato histórico de Categorias intacto (nombre)',
       filaPorId('Categorias', 'cat_cine')[col('Categorias', 'nombre')], 'Cine');
  R.eq('C1 · dato histórico de Categorias intacto (color)',
       filaPorId('Categorias', 'cat_cine')[col('Categorias', 'color_hex')], '#e11d48');
  R.eq('C1 · dato histórico de Planes intacto (titulo)',
       filaPorId('Planes', 'plan_peli')[col('Planes', 'titulo')], 'Ver peli');

  const catCols = headersDe('Categorias').length;
  const planCols = headersDe('Planes').length;
  setupSheets(); // 2da corrida
  R.check('C1 · setupSheets idempotente en Categorias',
          headersDe('Categorias').length === catCols && catCols === 10);
  R.check('C1 · setupSheets idempotente en Planes',
          headersDe('Planes').length === planCols && planCols === 12);
}

// Criterio 3 — backfill deja Categorias en 'activa', no toca Planes.estado,
// idempotente.
function grupoBackfill(R) {
  const r1 = backfillAuditoriaCategoriasPlanes();
  R.eq('C3 · backfill marca 2 categorías', r1.actualizados, 2);
  R.eq('C3 · cat_cine.estado = activa',
       filaPorId('Categorias', 'cat_cine')[col('Categorias', 'estado')], 'activa');
  R.eq('C3 · cat_comida.estado = activa',
       filaPorId('Categorias', 'cat_comida')[col('Categorias', 'estado')], 'activa');
  R.eq('C3 · NO toca Planes.estado',
       filaPorId('Planes', 'plan_peli')[col('Planes', 'estado')], 'pendiente');

  const r2 = backfillAuditoriaCategoriasPlanes();
  R.eq('C3 · backfill idempotente (actualizados=0)', r2.actualizados, 0);
}

// Criterio 9 — crear/editar categoría puebla los campos de auditoría en ISO UTC.
function grupoCamposAuditoria(R) {
  const crear = parseResp(handleCreateCategoria(
    { nombre: 'Viajes', colorHex: '#2563eb', authUserId: 'usr_fran' }));
  R.eq('C9 · createCategoria -> 200', crear.status, 200);
  R._catViajes = crear.categoriaId;

  const fila = filaPorId('Categorias', R._catViajes);
  R.eq('C9 · creado_por poblado', fila[col('Categorias', 'creado_por')], 'usr_fran');
  R.check('C9 · fecha_creacion en ISO 8601 UTC',
          ISO_UTC.test(String(fila[col('Categorias', 'fecha_creacion')])));
  R.eq('C9 · estado inicial = activa', fila[col('Categorias', 'estado')], 'activa');

  const editar = parseResp(handleUpdateCategoria(
    { categoriaId: R._catViajes, nombre: 'Viajes largos', authUserId: 'usr_noe' }));
  R.eq('C9 · updateCategoria -> 200', editar.status, 200);

  const fila2 = filaPorId('Categorias', R._catViajes);
  R.eq('C9 · modificado_por = usr_noe', fila2[col('Categorias', 'modificado_por')], 'usr_noe');
  R.check('C9 · fecha_modificacion en ISO 8601 UTC',
          ISO_UTC.test(String(fila2[col('Categorias', 'fecha_modificacion')])));
}

// Criterio 10 — Planes.fecha_creacion nuevo se guarda como TEXTO ISO UTC; las
// filas históricas (fecha nativa) se siguen leyendo bien.
function grupoPlanesISO(R) {
  const crear = parseResp(handleCreatePlan(
    { titulo: 'Cenar', categoriaId: 'cat_comida', userId: 'usr_fran', fechaProgramada: '2026-10-01' }));
  R.eq('C10 · createPlan -> 200', crear.status, 200);
  R._planCenar = crear.planId;

  const fila = filaPorId('Planes', R._planCenar);
  const fc = fila[col('Planes', 'fecha_creacion')];
  R.check('C10 · Planes.fecha_creacion es texto (no Date nativo)', typeof fc === 'string');
  R.check('C10 · Planes.fecha_creacion en ISO 8601 UTC', ISO_UTC.test(String(fc)));

  const planes = parseResp(handleGetPlanes({})).planes;
  const cenar = planes.filter(p => p.planId === R._planCenar)[0];
  R.check('C10 · getPlanes formatea la fecha nueva a AAAA-MM-DD',
          !!cenar && /^\d{4}-\d{2}-\d{2}$/.test(cenar.fechaCreacion));
  const peli = planes.filter(p => p.planId === 'plan_peli')[0];
  R.check('C10 · getPlanes sigue leyendo el plan histórico (fecha nativa)',
          !!peli && /^\d{4}-\d{2}-\d{2}$/.test(peli.fechaCreacion));

  const comp = parseResp(handleCompletePlan({ planId: R._planCenar, authUserId: 'usr_noe' }));
  R.eq('C10 · completePlan -> 200', comp.status, 200);
  const fila2 = filaPorId('Planes', R._planCenar);
  R.eq('C10 · estado = completado', fila2[col('Planes', 'estado')], 'completado');
  R.eq('C10 · completePlan setea modificado_por', fila2[col('Planes', 'modificado_por')], 'usr_noe');
}

// Criterios 4, 5, 6, 7, 8, 11 — borrado lógico y sus efectos.
function grupoBorradoLogico(R) {
  // C6 — no se puede borrar una categoría con un plan activo
  const bloq = parseResp(handleDeleteCategoria({ categoriaId: 'cat_cine', authUserId: 'usr_fran' }));
  R.eq('C6 · deleteCategoria con plan activo -> 409', bloq.status, 409);
  R.eq('C6 · cat_cine sigue activa',
       filaPorId('Categorias', 'cat_cine')[col('Categorias', 'estado')], 'activa');

  // C7 — borrado lógico de plan
  const delPlan = parseResp(handleDeletePlan({ planId: 'plan_peli', authUserId: 'usr_fran' }));
  R.eq('C7 · deletePlan -> 200', delPlan.status, 200);
  const filaPlan = filaPorId('Planes', 'plan_peli');
  R.check('C7 · la fila del plan NO se borra', !!filaPlan);
  R.eq('C7 · plan.estado = eliminado', filaPlan[col('Planes', 'estado')], 'eliminado');
  R.eq('C7 · plan.eliminado_por = usr_fran', filaPlan[col('Planes', 'eliminado_por')], 'usr_fran');
  R.check('C7 · plan.fecha_eliminacion en ISO UTC',
          ISO_UTC.test(String(filaPlan[col('Planes', 'fecha_eliminacion')])));

  // C8 — el plan eliminado desaparece de getPlanes y no se puede tocar
  R.check('C8 · getPlanes no devuelve el plan eliminado',
          parseResp(handleGetPlanes({})).planes.filter(p => p.planId === 'plan_peli').length === 0);
  R.eq('C7 · 2do deletePlan(plan_peli) -> 404',
       parseResp(handleDeletePlan({ planId: 'plan_peli', authUserId: 'usr_fran' })).status, 404);
  R.eq('C8 · updatePlan sobre plan eliminado -> 404',
       parseResp(handleUpdatePlan({ planId: 'plan_peli', titulo: 'x', authUserId: 'usr_fran' })).status, 404);
  R.eq('C8 · completePlan sobre plan eliminado -> 404',
       parseResp(handleCompletePlan({ planId: 'plan_peli', authUserId: 'usr_fran' })).status, 404);

  // C6 — ahora sí se puede borrar la categoría (su único plan está eliminado)
  const delCat = parseResp(handleDeleteCategoria({ categoriaId: 'cat_cine', authUserId: 'usr_noe' }));
  R.eq('C6 · deleteCategoria con el plan ya eliminado -> 200', delCat.status, 200);

  // C4 — borrado lógico de categoría
  const filaCat = filaPorId('Categorias', 'cat_cine');
  R.check('C4 · la fila de la categoría NO se borra', !!filaCat);
  R.eq('C4 · categoria.estado = eliminada', filaCat[col('Categorias', 'estado')], 'eliminada');
  R.eq('C4 · categoria.eliminado_por = usr_noe', filaCat[col('Categorias', 'eliminado_por')], 'usr_noe');
  R.check('C4 · categoria.fecha_eliminacion en ISO UTC',
          ISO_UTC.test(String(filaCat[col('Categorias', 'fecha_eliminacion')])));

  // C5 — la categoría eliminada desaparece y no se puede tocar
  R.check('C5 · getCategorias no devuelve la categoría eliminada',
          parseResp(handleGetCategorias({})).categorias.filter(c => c.categoriaId === 'cat_cine').length === 0);
  R.eq('C5 · updateCategoria sobre categoría eliminada -> 404',
       parseResp(handleUpdateCategoria({ categoriaId: 'cat_cine', nombre: 'x', authUserId: 'usr_fran' })).status, 404);
  R.eq('C5 · 2do deleteCategoria -> 404',
       parseResp(handleDeleteCategoria({ categoriaId: 'cat_cine', authUserId: 'usr_fran' })).status, 404);
  R.eq('C5 · createPlan con FK a categoría eliminada -> 404',
       parseResp(handleCreatePlan({ titulo: 'z', categoriaId: 'cat_cine', userId: 'usr_fran', fechaProgramada: '2026-10-01' })).status, 404);

  // C11 — se puede reusar el nombre de una categoría eliminada
  R.eq('C11 · crear categoría con el nombre de la eliminada -> 200',
       parseResp(handleCreateCategoria({ nombre: 'Cine', colorHex: '#111827', authUserId: 'usr_fran' })).status, 200);
}

// Criterios 12, 13, 15 — filas de Auditoria de los borrados y del logout;
// sin secretos en el log.
function grupoAuditoria(R) {
  const filas = filasDe('Auditoria');
  const iAcc = col('Auditoria', 'accion');
  const iEnt = col('Auditoria', 'entidad_id');
  const iDet = col('Auditoria', 'detalle');
  const iFec = col('Auditoria', 'fecha');

  const planElim = filas.filter(f => f[iAcc] === 'plan.eliminar' && f[iEnt] === 'plan_peli')[0];
  R.check('C13 · fila plan.eliminar registrada', !!planElim);
  if (planElim) R.eq('C13 · detalle de plan.eliminar trae el título',
                     JSON.parse(planElim[iDet]).titulo, 'Ver peli');

  const catElim = filas.filter(f => f[iAcc] === 'categoria.eliminar' && f[iEnt] === 'cat_cine')[0];
  R.check('C13 · fila categoria.eliminar registrada', !!catElim);
  if (catElim) R.eq('C13 · detalle de categoria.eliminar trae el nombre',
                    JSON.parse(catElim[iDet]).nombre, 'Cine');

  R.check('C12 · todas las fechas de Auditoria en ISO 8601 UTC',
          filas.every(f => ISO_UTC.test(String(f[iFec]))));

  // C12 — un login (crearSesion) NO escribe en Auditoria; queda en Sesiones.
  const antesLogin = filasDe('Auditoria').length;
  const token = crearSesion('usr_fran');
  const sessionId = token.split('.')[0];
  R.eq('C12 · crear sesión (login) NO agrega fila a Auditoria',
       filasDe('Auditoria').length, antesLogin);

  // C12 — logout sí escribe una fila
  handleLogout({ sessionToken: token });
  const logout = filasDe('Auditoria').filter(f => f[iAcc] === 'logout' && f[iEnt] === sessionId)[0];
  R.check('C12 · logout registra fila en Auditoria (con session_id)', !!logout);
  R.check('C12 · Auditoria no tiene ninguna fila accion=login',
          !filasDe('Auditoria').some(f => f[iAcc] === 'login'));

  // C15 — ninguna celda de Auditoria contiene secretos
  const hexLargo = /\b[0-9a-f]{64}\b/i;
  const sospechoso = filasDe('Auditoria').some(f => f.some(celda => {
    const s = String(celda);
    return hexLargo.test(s) || /token_hash|sessionToken|SESSION_SECRET|secreto=/i.test(s);
  }));
  R.check('C15 · Auditoria no contiene token_hash / secretos / hash de 64 hex', !sospechoso);

  R.nota('C12 · login_denegado NO se prueba acá (requiere token real de Google) — ver harness de Node + smoke manual. El login OK ya no escribe en Auditoria (queda en Sesiones).');
}

// Criterio 14 — si la hoja Auditoria no está, las operaciones siguen andando;
// el fallo queda en el log.
function grupoFalloSilencioso(R) {
  const ss = abrirPlanilla();
  const hoja = ss.getSheetByName('Auditoria');
  hoja.setName('Auditoria_APAGADA');           // la "rompemos" sin perder los datos
  SpreadsheetApp.flush();

  const crear = parseResp(handleCreatePlan(
    { titulo: 'Sobrevive', categoriaId: 'cat_comida', userId: 'usr_fran', fechaProgramada: '2026-11-01' }));
  const borrar = parseResp(handleDeletePlan({ planId: crear.planId, authUserId: 'usr_fran' }));
  R.eq('C14 · deletePlan sigue devolviendo 200 sin la hoja Auditoria', borrar.status, 200);
  R.check('C14 · el fallo de auditoría quedó en Logger.log',
          Logger.getLog().indexOf('registrarAuditoria falló') !== -1);

  hoja.setName('Auditoria');                    // restaurar
  SpreadsheetApp.flush();
}

// Criterio 15 (parte pura) — sanitización de Auditoria.detalle y enmascarado.
function grupoSanitizar(R) {
  const s = sanitizarDetalleAuditoria(
    { email: 'a@b.com', token_hash: 'HASH', google_sub: 'SUB', sessionToken: 'T', nombre: 'N' });
  const o = JSON.parse(s);
  R.check('C15 · sanitizar conserva claves de la allowlist (email, nombre)',
          o.email === 'a@b.com' && o.nombre === 'N');
  R.check('C15 · sanitizar descarta token_hash / google_sub / sessionToken',
          !('token_hash' in o) && !('google_sub' in o) && !('sessionToken' in o));
  R.eq('C15 · sanitizar objeto vacío -> ""', sanitizarDetalleAuditoria({}), '');
  R.eq('C15 · sanitizar null -> ""', sanitizarDetalleAuditoria(null), '');
  R.eq('C15 · sanitizar descarta valores objeto anidados',
       sanitizarDetalleAuditoria({ email: { token_hash: 'x' } }), '');
  const trunc = JSON.parse(sanitizarDetalleAuditoria({ motivo: 'x'.repeat(600) }));
  R.check('C15 · detalle > 500 chars -> {"_truncado":true}', trunc._truncado === true);
  R.eq('C15 · enmascararEmail oculta el local-part', enmascararEmail('intruso@example.com'), 'i***@example.com');
}

// Criterio 16 — sin regresión funcional en lo no relacionado con el borrado.
function grupoRegresion(R) {
  const cats = parseResp(handleGetCategorias({})).categorias.map(c => c.nombre).sort();
  R.eq('C16 · getCategorias devuelve solo las activas',
       cats.join(','), ['Cine', 'Comida', 'Viajes largos'].join(','));

  const planes = parseResp(handleGetPlanes({})).planes;
  R.check('C16 · getPlanes devuelve "Cenar" y no el plan eliminado',
          planes.length === 1 && planes[0].titulo === 'Cenar');

  const user = parseResp(handleGetUser({ userId: 'usr_fran' }));
  R.check('C16 · getUser sigue funcionando', user.status === 200 && user.nombreDisplay === 'Fran');

  R.nota('C16 · subida de avatar no se prueba acá (Drive + base64); REQ-DATA-002 no toca handleUploadPhoto');
}

// ------------------------------------------------------------
// Reporte
// ------------------------------------------------------------

function nuevoReporte(req) {
  const detalles = [];
  const notas = [];
  let ok = 0, fail = 0;

  function push(desc, estado, info) {
    detalles.push(info ? { desc: desc, estado: estado, info: info } : { desc: desc, estado: estado });
  }

  return {
    check: function (desc, cond) {
      if (cond) { ok++; push(desc, 'OK'); }
      else { fail++; push(desc, 'FAIL'); Logger.log('FAIL: ' + desc); }
    },
    eq: function (desc, actual, esperado) {
      if (actual === esperado) { ok++; push(desc, 'OK'); }
      else {
        fail++;
        const info = 'esperado=' + JSON.stringify(esperado) + ' obtenido=' + JSON.stringify(actual);
        push(desc, 'FAIL', info);
        Logger.log('FAIL: ' + desc + ' | ' + info);
      }
    },
    fail: function (msg) { fail++; push(msg, 'FAIL'); Logger.log('FAIL: ' + msg); },
    nota: function (msg) { notas.push(msg); },
    finalizar: function () {
      return {
        req: req,
        total: ok + fail,
        ok: ok,
        fail: fail,
        veredicto: fail === 0 ? 'APTO' : 'RECHAZADO',
        detalles: detalles,
        notas: notas,
      };
    },
  };
}

// ------------------------------------------------------------
// Lectura de la planilla scratch (vía el seam, igual que la app)
// ------------------------------------------------------------

function headersDe(nombreHoja) {
  return getSheet(nombreHoja).getDataRange().getValues()[0];
}

function filasDe(nombreHoja) {
  const data = getSheet(nombreHoja).getDataRange().getValues();
  return data.slice(1);
}

function col(nombreHoja, header) {
  return headersDe(nombreHoja).indexOf(header);
}

function filaPorId(nombreHoja, id) {
  const filas = filasDe(nombreHoja);
  for (let i = 0; i < filas.length; i++) {
    if (filas[i][0] === id) return filas[i];
  }
  return null;
}

function parseResp(textOutput) {
  return JSON.parse(textOutput.getContent());
}


// ============================================================
// probarBUGLOGIN001B() — BUG-LOGIN-001 / Bug B: 401 espurio post-login por la
// carrera con la hoja Sesiones. Verifica el puente de CacheService que agrega
// crearSesion() y consulta validarSesion() cuando la fila todavía no es visible.
//
// Uso (Duck):  clasp push -f -P .clasp-test.json -I .claspignore-test
//              clasp run probarBUGLOGIN001B -P .clasp-test.json
//
// Crea su propia planilla scratch y la borra al terminar. No toca prod ni test.
// Limpia del CacheService todas las claves 'sesion:*' que crea, entrando y
// saliendo (el CacheService es del proyecto, no de la planilla scratch).
//
// Qué NO cubre (requiere navegador + popup OAuth de Google, lo hace Franco):
//   - Criterios 1 y 2 end-to-end: 10 logins reales con cold start del Web App.
//   - Criterio 6: F5 / restaurar sesión desde localStorage.
// Acá los criterios 1/2 se cubren a nivel unidad (la hoja no ve la fila ->
// validarSesion la sirve desde el puente).
// ============================================================

var B_CLAVES_CACHE = [];

// ============================================================
// Setup del ENTORNO DE TEST (Script Properties + planilla de test + usuario de
// prueba), para poder hacer el smoke de login real por navegador contra el
// Web App de test. Vive acá a propósito: Tests.gs nunca se despliega a prod
// (.claspignore lo excluye), así que esto no puede terminar corriendo ahí.
// Se corre UNA sola vez, a mano, desde el editor, en este orden:
//   1. setupEntornoTest_paso1_crearPlanillaYConfig()
//   2. setupSheets()                                  (ya existe, Code.gs)
//   3. setupEntornoTest_paso2_agregarUsuario()         (editar el email antes)
// ============================================================

// Paso 1 — crea una planilla de test nueva (separada de la de prod) y carga
// Script Properties. OAUTH_CLIENT_ID es el mismo cliente OAuth que ya usa el
// frontend (no es secreto, está a la vista en index.html). SESSION_SECRET se
// genera acá mismo, random, para no tener que inventarlo ni pegarlo a mano.
//
// Ojo: SPREADSHEET_ID es un const que se lee UNA vez al arrancar cada
// ejecución (línea ~21). Por eso el paso 2 (setupSheets) es una corrida
// APARTE — recién ahí el script arranca ya viendo la property nueva.
function setupEntornoTest_paso1_crearPlanillaYConfig() {
  const ss = SpreadsheetApp.create('Peroncitos TEST');
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID:  ss.getId(),
    OAUTH_CLIENT_ID: '223985831716-tjfd9qachr7uqb15mjchotp5fodnedi7.apps.googleusercontent.com',
    SESSION_SECRET:  Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid(),
  }, false);
  Logger.log('Planilla de test creada: ' + ss.getUrl());
  Logger.log('Listo. Ahora corré, en este orden: setupSheets()  y después  setupEntornoTest_paso2_agregarUsuario() (editando el email primero).');
}

// Paso 2 — agrega tu usuario de prueba a la hoja Usuarios de la planilla de
// test. Usá el MISMO email que ya está cargado como "usuario de prueba" en la
// pantalla de consentimiento OAuth (Google Cloud > OAuth consent screen).
// Editá EMAIL_DE_PRUEBA / NOMBRE_DE_PRUEBA antes de correr. Corré esto DESPUÉS
// de setupSheets(), no antes (necesita la hoja Usuarios ya creada).
function setupEntornoTest_paso2_agregarUsuario() {
  const EMAIL_DE_PRUEBA  = 'REEMPLAZAR@gmail.com';
  const NOMBRE_DE_PRUEBA = 'REEMPLAZAR';

  if (EMAIL_DE_PRUEBA.indexOf('REEMPLAZAR') !== -1) {
    Logger.log('Editá EMAIL_DE_PRUEBA y NOMBRE_DE_PRUEBA arriba antes de correr esta función.');
    return;
  }

  const sheet = getSheet(SHEETS.USUARIOS);
  // Orden de columnas de Usuarios: usuario_id, nombre_display, email,
  // google_sub, foto_url, avatar_archivo_id (setupSheets() las crea así).
  sheet.appendRow([newId('usr'), NOMBRE_DE_PRUEBA, EMAIL_DE_PRUEBA.toLowerCase(), '', '', '']);
  SpreadsheetApp.flush();
  Logger.log('Usuario de prueba agregado: ' + EMAIL_DE_PRUEBA + '. Ya podés loguearte desde el navegador.');
}

// Wrapper para correr desde el editor de Apps Script: loguea el reporte completo
// (el editor no muestra el valor de retorno de la función que se ejecuta).
function probarBUGLOGIN001B_log() {
  Logger.log(JSON.stringify(probarBUGLOGIN001B(), null, 2));
}

function probarBUGLOGIN001B() {
  const R = nuevoReporte('BUG-LOGIN-001-B');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarBUGLOGIN001B ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);

    setupSheets();
    const mias = ['Usuarios', 'Categorias', 'Planes', 'Archivos', 'Sesiones', 'Auditoria'];
    ss.getSheets().forEach(sh => {
      if (mias.indexOf(sh.getName()) === -1) ss.deleteSheet(sh);
    });
    SpreadsheetApp.flush();

    b_limpiarCache();

    grpB_puenteHappyPath(R);
    grpB_sinSecretoEnCache(R);
    grpB_fallbackCuandoLaHojaNoVeLaFila(R);
    grpB_rechazosEnPathDeCache(R);
    grpB_logoutBorraLaCache(R);
    grpB_logoutColdWindow(R);
    grpB_expiracionEnCache(R);
    grpB_hojaQueTiraNoConsultaCache(R);
    grpB_regresionSesion(R);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    b_limpiarCache();
    if (scratchId) {
      try {
        DriveApp.getFileById(scratchId).setTrashed(true);
      } catch (e) {
        R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e);
      }
    }
  }

  return R.finalizar();
}

// ------------------------------------------------------------
// Helpers Bug B
// ------------------------------------------------------------

// crearSesion() real, trackeando la clave de cache para limpiarla después.
function b_crearSesion(userId) {
  const token = crearSesion(userId);
  b_track('sesion:' + token.split('.')[0]);
  return token;
}

function b_track(clave) {
  if (B_CLAVES_CACHE.indexOf(clave) === -1) B_CLAVES_CACHE.push(clave);
}

function b_cachePut(sessionId, obj, ttl) {
  const k = 'sesion:' + sessionId;
  CacheService.getScriptCache().put(k, JSON.stringify(obj), ttl || SESION_CACHE_BRIDGE_SEC);
  b_track(k);
}

function b_cacheGetRaw(sessionId) {
  return CacheService.getScriptCache().get('sesion:' + sessionId);
}

function b_limpiarCache() {
  if (B_CLAVES_CACHE.length) {
    try { CacheService.getScriptCache().removeAll(B_CLAVES_CACHE); } catch (e) { /* ignorado */ }
  }
  B_CLAVES_CACHE = [];
}

// Saca la fila de una sesión de la hoja y devuelve sus valores (en orden de
// columna) para poder re-insertarla y simular "la hoja se puso al día".
function b_quitarFilaSesion(sessionId) {
  const sheet = getSheet(SHEETS.SESIONES);
  const data  = sheet.getDataRange().getValues();
  const iId   = data[0].indexOf('session_id');
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][iId] === sessionId) {
      const valores = data[i].slice();
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return valores;
    }
  }
  return null;
}

function b_reinsertarFilaSesion(valores) {
  getSheet(SHEETS.SESIONES).appendRow(valores);
  SpreadsheetApp.flush();
}

// ------------------------------------------------------------
// Grupos de verificación (Bug B)
// ------------------------------------------------------------

// Happy path: con la fila en la hoja, validarSesion resuelve por la HOJA.
function grpB_puenteHappyPath(R) {
  const token = b_crearSesion('usr_fran');
  const sid   = token.split('.')[0];

  const v = validarSesion(token);
  R.eq('HP · validarSesion con la fila presente -> userId', v.userId, 'usr_fran');
  R.check('HP · sin error', !v.error);
  R.check('HP · getSesionRow encuentra la fila', !!getSesionRow(sid));
}

// Criterio 8 — la entrada de cache NO tiene el secreto crudo ni el token entero.
function grpB_sinSecretoEnCache(R) {
  const token = b_crearSesion('usr_fran');
  const partes  = token.split('.');
  const sid     = partes[0];
  const secreto = partes[1];

  const crudo = b_cacheGetRaw(sid);
  R.check('C8 · crearSesion dejó entrada en el puente de cache', !!crudo);
  if (!crudo) return;

  const entry = JSON.parse(crudo);
  R.eq('C8 · claves de la entrada = exp,h,u',
       Object.keys(entry).sort().join(','), 'exp,h,u');
  R.check('C8 · la entrada NO contiene el secreto crudo', crudo.indexOf(secreto) === -1);
  R.check('C8 · la entrada NO contiene el token completo', crudo.indexOf(token) === -1);
  R.eq('C8 · h == hmacHex(secreto) (mismo hash que la hoja)', entry.h, hmacHex(secreto));
  R.eq('C8 · u == userId', entry.u, 'usr_fran');
  R.check('C8 · exp es ISO 8601 UTC', ISO_UTC.test(String(entry.exp)));

  const fila = getSesionRow(sid);
  R.eq('C8 · token_hash de la hoja == h de la cache', String(fila.token_hash), entry.h);
}

// Criterios 1 y 2 (nivel unidad) — la hoja todavía no ve la fila -> validarSesion
// la sirve desde el puente, sin caer a 401.
function grpB_fallbackCuandoLaHojaNoVeLaFila(R) {
  const token = b_crearSesion('usr_fran');
  const sid   = token.split('.')[0];

  const valores = b_quitarFilaSesion(sid);
  R.check('C1 · precondición: getSesionRow devuelve null limpio', getSesionRow(sid) === null);

  const v = validarSesion(token);
  R.eq('C1/C2 · validarSesion sirve la sesión desde el puente -> userId', v.userId, 'usr_fran');
  R.check('C1/C2 · sin error (no hay 401 espurio)', !v.error);

  b_reinsertarFilaSesion(valores);
}

// Criterio 3 — en el path de cache un token no auténtico igual da rechazo.
function grpB_rechazosEnPathDeCache(R) {
  const token = b_crearSesion('usr_fran');
  const partes  = token.split('.');
  const sid     = partes[0];
  const secreto = partes[1];
  const valores = b_quitarFilaSesion(sid);

  const ultima    = secreto.slice(-1);
  const tokenMalo = sid + '.' + secreto.slice(0, -1) + (ultima === 'a' ? 'b' : 'a');
  const v1 = validarSesion(tokenMalo);
  R.check('C3 · secreto corrupto con sessionId real -> error (HMAC no coincide en cache)', !!v1.error);
  R.check('C3 · no devuelve userId', !v1.userId);

  const v2 = validarSesion('ses_noexiste_zzz.deadbeefdeadbeef');
  R.check('C3 · sessionId inexistente -> error', !!v2.error);

  b_reinsertarFilaSesion(valores);
}

// Condición A de Gary + criterio 4 — handleLogout borra la clave de cache SIEMPRE.
function grpB_logoutBorraLaCache(R) {
  const token = b_crearSesion('usr_fran');
  const sid   = token.split('.')[0];

  R.check('C4 · precondición: la clave de cache existe tras el login', !!b_cacheGetRaw(sid));

  handleLogout({ sessionToken: token });
  R.check('CondA/C4 · handleLogout borró la clave de cache', b_cacheGetRaw(sid) === null);

  const fila = getSesionRow(sid);
  R.eq('C4 · la fila quedó estado=revocada', fila && fila.estado, 'revocada');
  R.check('C4 · validarSesion tras logout -> error', !!validarSesion(token).error);
}

// Criterio 4, caso borde — logout mientras el login todavía no es visible en la
// hoja. El cache.remove incondicional tiene que cortar igual DENTRO de la ventana.
function grpB_logoutColdWindow(R) {
  const token = b_crearSesion('usr_fran');
  const sid   = token.split('.')[0];
  const valores = b_quitarFilaSesion(sid);

  handleLogout({ sessionToken: token });
  R.check('C4-borde · cache borrada aunque revocarSesion no vio la fila', b_cacheGetRaw(sid) === null);

  const v = validarSesion(token);
  R.check('C4-borde · validarSesion -> error dentro de la ventana (sheet null + cache vacía)', !!v.error);

  // La hoja "se pone al día": la fila reaparece. Antes del veto de cache
  // (SESION_REVOCACION_PENDIENTE_SEC / marcarRevocacionPendiente), acá la
  // revocación se perdía: revocarSesion() no vio la fila a tiempo y la sesión
  // "revivía" activa. Ahora validarSesion() consulta el veto y la corta igual.
  b_reinsertarFilaSesion(valores);
  const v2 = validarSesion(token);
  R.check('C4-borde · sesión sigue cortada tras ponerse al día la hoja (veto de revocación pendiente)',
          !!v2.error);

  // El veto también se autocorrige: validarSesion() debe haber revocado la
  // fila recién visible en vez de dejarla 'activa' para siempre.
  const filaTrasVeto = getSesionRow(sid);
  R.check('C4-borde · la fila queda revocada tras aplicar el veto retroactivo',
          !filaTrasVeto || filaTrasVeto.estado === 'revocada');
}

// Criterio 5 — expiración también se respeta en el path de cache. Y todos los
// rechazos de validarDesdePuente devuelven null (nunca "válida" por error).
function grpB_expiracionEnCache(R) {
  const secreto = 'secreto_de_prueba_para_el_puente';
  const h = hmacHex(secreto);
  const futuro = new Date(Date.now() + 3600 * 1000).toISOString();

  b_cachePut('ses_exp_vencida', { h: h, u: 'usr_fran', exp: '2020-01-01T00:00:00.000Z' });
  R.check('C5 · validarDesdePuente con exp pasada -> null',
          validarDesdePuente('ses_exp_vencida', secreto) === null);

  b_cachePut('ses_ok', { h: h, u: 'usr_fran', exp: futuro });
  const v = validarDesdePuente('ses_ok', secreto);
  R.eq('C5 · validarDesdePuente con exp futura + hash ok -> userId', v && v.userId, 'usr_fran');

  R.check('C5 · validarDesdePuente con hash que no coincide -> null',
          validarDesdePuente('ses_ok', 'otro_secreto') === null);

  CacheService.getScriptCache().put('sesion:ses_basura', 'no-es-json', 120);
  b_track('sesion:ses_basura');
  R.check('C5 · validarDesdePuente con entry ilegible -> null',
          validarDesdePuente('ses_basura', secreto) === null);

  b_cachePut('ses_sin_h', { u: 'usr_fran', exp: futuro });
  R.check('C5 · validarDesdePuente sin h -> null', validarDesdePuente('ses_sin_h', secreto) === null);

  b_cachePut('ses_sin_exp', { h: h, u: 'usr_fran' });
  R.check('C5 · validarDesdePuente sin exp -> null', validarDesdePuente('ses_sin_exp', secreto) === null);

  R.check('C5 · validarDesdePuente sin entrada -> null',
          validarDesdePuente('ses_no_hay_nada', secreto) === null);
}

// Condición B de Gary — si la lectura de la hoja TIRA, validarSesion NO consulta
// la cache: propaga el error, no devuelve una sesión "válida".
function grpB_hojaQueTiraNoConsultaCache(R) {
  const token = b_crearSesion('usr_fran');
  const sid   = token.split('.')[0];
  R.check('CondB · precondición: entry de cache presente', !!b_cacheGetRaw(sid));

  const hoja = abrirPlanilla().getSheetByName('Sesiones');
  hoja.setName('Sesiones_OFF');
  SpreadsheetApp.flush();

  let tiro = false;
  let resultado = null;
  try {
    resultado = validarSesion(token);
  } catch (e) {
    tiro = true;
  } finally {
    hoja.setName('Sesiones');
    SpreadsheetApp.flush();
  }

  R.check('CondB · validarSesion propaga la excepción de la hoja (no la traga)', tiro);
  R.check('CondB · NO devolvió una sesión válida desde la cache', !(resultado && resultado.userId));
}

// Regresión — el path normal (fila presente) sigue igual.
function grpB_regresionSesion(R) {
  const token = b_crearSesion('usr_fran');

  const v1 = validarSesion(token);
  const v2 = validarSesion(token);
  R.eq('REG · validarSesion 2x seguidas -> userId (1)', v1.userId, 'usr_fran');
  R.eq('REG · validarSesion 2x seguidas -> userId (2)', v2.userId, 'usr_fran');

  handleLogout({ sessionToken: token });
  R.check('REG · tras logout normal -> error', !!validarSesion(token).error);
}
