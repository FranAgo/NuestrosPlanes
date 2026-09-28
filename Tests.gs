// ============================================================
// Tests.gs — Pruebas server-side. NO forma parte del runtime de la app:
// ninguna función de acá está en el router (doPost) ni en un trigger.
//
// probarDATA002()  — verifica REQ-DATA-002 contra Google Sheets REAL, sobre una
//                    planilla scratch que la propia función crea y borra.
//
// Uso (Roy):  clasp push -f -P .clasp-test.json -I .claspignore-test
//             clasp run probarDATA002 -P .clasp-test.json -u duck
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
          headersDe('Planes').length === planCols && planCols === PLANES_HEADERS.length);
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

  // REQ-MEDIA-002: completePlan ahora exige al menos 1 foto activa. Esta
  // suite es sobre fechas/auditoría, no sobre Drive, así que el gate se
  // satisface con una fila de Archivos directa (sin subir nada real a
  // Drive) — la mecánica de subida real de punta a punta la cubre
  // probarMEDIA002().
  insertArchivo({
    ownerTipo: 'plan', ownerId: R._planCenar, proposito: 'adjunto',
    driveFileId: 'fake-drive-id-test-c10', mimeType: 'image/png', tamanoBytes: 1,
    subidoPor: 'usr_fran', estado: 'activo',
  });

  darAcuerdosDeLosDos(R._planCenar); // REQ-PLAN-001
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

// REQ-PLAN-001: completePlan exige el acuerdo de todos los habilitados. Las
// suites que no son sobre el acuerdo lo dan de entrada con esta ayuda.
function darAcuerdosDeLosDos(planId) {
  ['usr_fran', 'usr_noe'].forEach(u => {
    handleSetAcuerdoCierre({ planId: planId, deAcuerdo: true, authUserId: u });
  });
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

// Paso 3 — crea la carpeta de Drive para avatares del entorno de TEST y la
// carga como DRIVE_FOLDER_ID en Script Properties. Ningún REQ anterior tocaba
// Drive (REQ-DATA-002/BUG-LOGIN-001 lo dejaban fuera de alcance a propósito),
// así que esta property nunca se configuró para test hasta REQ-MEDIA-001, que
// sí necesita subir/leer binarios reales. Idempotente: si ya existe, no crea
// una segunda carpeta.
function setupEntornoTest_paso3_crearCarpetaDriveFotos() {
  const existente = PROPS.getProperty('DRIVE_FOLDER_ID');
  if (existente) {
    Logger.log('DRIVE_FOLDER_ID ya está configurado (' + existente + '). No se crea otra carpeta.');
    return;
  }

  const carpeta = DriveApp.createFolder('Peroncitos TEST — fotos');
  PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', carpeta.getId());
  Logger.log('Carpeta de Drive creada para test: ' + carpeta.getUrl());
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

// ============================================================
// probarMEDIA001() — REQ-MEDIA-001: servido de archivos gateado por sesión.
// Verifica getArchivo, el backfill de metadata y la revocación de sharing
// contra Google Sheets Y Drive REALES (usa el DRIVE_FOLDER_ID configurado en
// las Script Properties del proyecto donde corra esto — en test, el mismo
// que usa el smoke manual de login). Sube una imagen mínima real (1x1 PNG,
// 68 bytes) y la borra (trash) al terminar, pase lo que pase.
//
// Uso (Duck):  clasp push -f -P .clasp-test.json -I .claspignore-test
//              clasp run probarMEDIA001 -P .clasp-test.json
//
// Nota sobre el criterio 1 (401 sin sesión): handleGetArchivo() en sí NO
// recibe ni chequea sessionToken — el gate vive en el router (doPost,
// Code.gs:130-147). Por eso grupoGetArchivoSinSesion() de acá abajo llama a
// doPost() de punta a punta (con un event object simulado), no a
// handleGetArchivo() directo — llamar al handler directo no ejercita el gate
// y hubiera dado un falso positivo. El mecanismo genérico de validarSesion()
// (token corrupto/inexistente -> error) ya está cubierto por grpB_* de
// REQ-SEC-001; lo que agrega este caso es la prueba de que 'getArchivo' en
// particular no quedó, por error, en la lista publicActions.
//
// Fuera de alcance de este runner (se cubren aparte):
//   - Criterio 4 (visibilidad: cualquier sesión ve cualquier archivo, sin
//     chequeo de dueño): comportamiento IMPLEMENTADO y verificado más abajo.
//     Decisión de diseño ratificada por Julia (AppSec) y Paul (PM) el
//     2026-09-14 — ver REQ-MEDIA-001.md criterio 4.
//   - Criterio 8 (frontend: sin <img> a URL pública): requiere Network del
//     navegador — smoke manual, no server-side.
//   - Criterio 9 (Logger sin base64 en el resto de la app) y criterio 10
//     (regresión general de login/planes/categorías): ya cubiertos por
//     probarDATA002 / probarBUGLOGIN001B; acá solo se verifica que ESTE REQ
//     en particular no vuelque el base64 al log.
// ============================================================

const MEDIA001_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function probarMEDIA001() {
  const R = nuevoReporte('REQ-MEDIA-001');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  let scratchId = null;
  const driveFileIdsCreados = []; // se trashean en el finally, pase lo que pase

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarMEDIA001 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);

    sembrarEstadoMedia001(ss);

    grupoGetArchivoSinSesion(R);
    grupoGetArchivoNoEncontrado(R);
    const archivoIdSubido = grupoUploadYGetArchivo(R, driveFileIdsCreados);
    if (archivoIdSubido) {
      grupoBackfillMetadata(R, archivoIdSubido);
      grupoRevocacionSharing(R, archivoIdSubido);
    } else {
      R.fail('MEDIA-001 · no se pudo subir la imagen de prueba — se saltan backfill y revocación');
    }

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    driveFileIdsCreados.forEach(fileId => {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch (e) {
        R.nota('no se pudo borrar de Drive el archivo de prueba ' + fileId + ' — borralo a mano: ' + e);
      }
    });
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
// Fixture: Usuarios con avatar_archivo_id vacío, como estarían recién
// después de setupSheets() en una planilla nueva.
// ------------------------------------------------------------

function sembrarEstadoMedia001(ss) {
  setupSheets(); // crea Usuarios/Categorias/Planes/Archivos/Sesiones/Auditoria con headers correctos

  const usuarios = ss.getSheetByName('Usuarios');
  usuarios.appendRow(['usr_fran', 'Fran', 'fran@test.local', 'sub-fran', '', '']);
  usuarios.appendRow(['usr_noe',  'Noe',  'noe@test.local',  'sub-noe',  '', '']);

  // Sacar la hoja default que crea SpreadsheetApp.create().
  const nombresMios = ['Usuarios', 'Categorias', 'Planes', 'Archivos', 'Sesiones', 'Auditoria'];
  ss.getSheets().forEach(sh => {
    if (nombresMios.indexOf(sh.getName()) === -1) ss.deleteSheet(sh);
  });
  SpreadsheetApp.flush();
}

// ------------------------------------------------------------
// Grupos de verificación
// ------------------------------------------------------------

// Criterio 1 — getArchivo sin sesión válida -> 401, igual que el resto de
// las acciones. Pasa por doPost() completo (no por handleGetArchivo directo)
// porque el gate vive en el router, no en el handler — ver nota arriba de
// probarMEDIA001().
function grupoGetArchivoSinSesion(R) {
  const evento = {
    postData: {
      contents: JSON.stringify({
        action: 'getArchivo',
        archivoId: 'arc_no_importa',
        sessionToken: 'token-invalido-no-existe',
      }),
    },
  };
  const resp = parseResp(doPost(evento));
  R.eq('C1 · getArchivo sin sesión válida -> 401', resp.status, 401);

  const eventoSinToken = {
    postData: {
      contents: JSON.stringify({ action: 'getArchivo', archivoId: 'arc_no_importa' }),
    },
  };
  const respSinToken = parseResp(doPost(eventoSinToken));
  R.eq('C1 · getArchivo sin sessionToken -> 401', respSinToken.status, 401);
}

// Criterio 3 — archivoId inexistente o con estado != 'activo' -> 404. Estos
// casos NO tocan Drive (el filtro por fila corta antes), así que no
// necesitan la imagen real.
function grupoGetArchivoNoEncontrado(R) {
  const sinId = parseResp(handleGetArchivo({}));
  R.eq('MEDIA-001 · getArchivo sin archivoId -> 400', sinId.status, 400);

  const noExiste = parseResp(handleGetArchivo({ archivoId: 'arc_no_existe_zzz' }));
  R.eq('C3 · getArchivo con archivoId inexistente -> 404', noExiste.status, 404);

  const archivoArchivado = insertArchivo({
    ownerTipo: 'usuario', ownerId: 'usr_fran', proposito: 'avatar',
    driveFileId: 'fake-drive-id-no-se-lee', mimeType: 'image/jpeg', tamanoBytes: 10,
    subidoPor: 'usr_fran', estado: 'archivado',
  });
  const inactivo = parseResp(handleGetArchivo({ archivoId: archivoArchivado }));
  R.eq('C3 · getArchivo con estado != activo -> 404 (no revienta contra Drive)', inactivo.status, 404);
}

// Criterios 2 y 6 — sube una imagen real, verifica que nace privada y que
// getArchivo devuelve el binario correcto. Devuelve el archivo_id subido (o
// null si la subida falló) para que los grupos siguientes lo reutilicen.
function grupoUploadYGetArchivo(R, driveFileIdsCreados) {
  const subida = parseResp(handleUploadPhoto({
    userId: 'usr_fran', fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png',
  }));
  R.check('setup · uploadPhoto responde 200 con la imagen de prueba', subida.status === 200);
  if (subida.status !== 200) {
    R.nota('uploadPhoto de prueba falló: status=' + subida.status + ' error=' + subida.error +
           ' | Logger: ' + Logger.getLog());
    return null;
  }

  const fila = getArchivoRow(subida.archivoId);
  R.check('setup · insertArchivo dejó la fila esperada', !!fila);
  if (!fila) return null;

  driveFileIdsCreados.push(fila.drive_file_id);

  // C6 — nace sin ANYONE_WITH_LINK
  const file = DriveApp.getFileById(fila.drive_file_id);
  R.check('C6 · avatar nuevo nace SIN ANYONE_WITH_LINK',
          file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK);

  // C2 — getArchivo devuelve el binario real, comparado contra lo subido
  const leido = parseResp(handleGetArchivo({ archivoId: subida.archivoId }));
  R.eq('C2 · getArchivo responde 200', leido.status, 200);
  R.eq('C2 · getArchivo devuelve el mimeType correcto', leido.mimeType, 'image/png');
  R.eq('C2 · getArchivo devuelve el mismo base64 que se subió', leido.base64, MEDIA001_PIXEL_PNG_BASE64);

  // C4 (documentado, no ratificado formalmente) — cualquier sesión ve
  // cualquier archivo activo: handleGetArchivo no lee ni recibe authUserId,
  // así que un archivo de usr_fran se sirve igual sin importar quién pida.
  const leidoOtroUsuario = parseResp(handleGetArchivo({ archivoId: subida.archivoId, authUserId: 'usr_noe' }));
  R.eq('C4 (pendiente ratificar) · getArchivo no filtra por dueño', leidoOtroUsuario.status, 200);

  // C9 (parcial) — el Logger no debe tener el base64 de ESTA imagen.
  R.check('C9 · Logger.log no contiene el base64 de la imagen subida en este REQ',
          Logger.getLog().indexOf(MEDIA001_PIXEL_PNG_BASE64) === -1);

  return subida.archivoId;
}

// Criterio 7 — backfill de mime_type/tamano_bytes en filas "migradas"
// (simuladas: mismo patrón que dejó REQ-DATA-001, sin esos dos campos).
function grupoBackfillMetadata(R, archivoIdConDriveReal) {
  const filaBase = getArchivoRow(archivoIdConDriveReal);

  const archivoSinMeta = insertArchivo({
    ownerTipo: 'usuario', ownerId: 'usr_noe', proposito: 'avatar',
    driveFileId: filaBase.drive_file_id, subidoPor: 'usr_noe', estado: 'activo',
    // mimeType/tamanoBytes deliberadamente omitidos -> insertArchivo los deja en ''
  });

  const antes = getArchivoRow(archivoSinMeta);
  R.check('setup · la fila migrada simulada arranca sin mime_type/tamano_bytes',
          !antes.mime_type && antes.tamano_bytes === '');

  const resumen = backfillMetadataArchivos();
  R.check('C7 · backfillMetadataArchivos completa al menos 1 fila', resumen.completados >= 1);

  const despues = getArchivoRow(archivoSinMeta);
  R.eq('C7 · mime_type queda poblado tras el backfill', despues.mime_type, 'image/png');
  R.check('C7 · tamano_bytes queda poblado (> 0) tras el backfill', despues.tamano_bytes > 0);

  const resumen2 = backfillMetadataArchivos();
  R.check('C7 · backfillMetadataArchivos es idempotente (2da corrida no reprocesa la fila ya completa)',
          resumen2.yaCompletos >= 1);
}

// Criterio 5 — revoca ANYONE_WITH_LINK de un archivo que lo tenga (se fuerza
// el estado "viejo" para simular un avatar migrado por REQ-DATA-001).
function grupoRevocacionSharing(R, archivoIdConDriveReal) {
  const fila = getArchivoRow(archivoIdConDriveReal);
  const file = DriveApp.getFileById(fila.drive_file_id);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  R.check('setup · archivo forzado a ANYONE_WITH_LINK antes de revocar',
          file.getSharingAccess() === DriveApp.Access.ANYONE_WITH_LINK);

  const resumen = revocarSharingPublicoArchivos();
  R.check('C5 · revocarSharingPublicoArchivos revoca al menos 1 archivo', resumen.revocados >= 1);
  R.check('C5 · el archivo ya NO tiene ANYONE_WITH_LINK tras revocar',
          file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK);

  const resumen2 = revocarSharingPublicoArchivos();
  R.check('C5 · revocarSharingPublicoArchivos es idempotente (2da corrida no re-revoca)',
          resumen2.yaPrivados >= 1);
}

// ============================================================
// probarMEDIA002() — REQ-MEDIA-002: fotos de tarea obligatorias al completar
// + carrusel. Verifica el backend contra Google Sheets Y Drive REALES: sube
// imágenes mínimas reales (mismo pixel de prueba que probarMEDIA001) y crea
// carpetas reales bajo media/planes-fotos/ en el DRIVE_FOLDER_ID del entorno
// donde corra esto. Todo lo que crea (archivos y carpetas) se trashea en el
// finally, pase lo que pase.
//
// Uso (Duck):  clasp push -f -P .clasp-test.json -I .claspignore-test
//              clasp run probarMEDIA002 -P .clasp-test.json -u duck
//
// Los grupos de la primera tarea (gate → primera foto → segunda foto →
// editar título → completar) están deliberadamente ENCADENADOS, no son
// independientes entre sí: cada uno depende del estado real que Drive/Sheets
// quedaron después del anterior (mismo patrón que probarMEDIA001 con
// grupoUploadYGetArchivo). Repetir esa carpeta/tarea desde cero en cada
// grupo multiplicaría las subidas reales a Drive sin necesidad.
//
// Fuera de alcance de este runner (se cubren aparte):
//   - Criterio 6 (parte visual): el preview del dashboard y el modal del
//     carrusel son de Jay (Fase 2, todavía no existe) — acá solo se verifica
//     que getRecentPlanPhotos devuelve los datos correctos para que Jay los
//     consuma.
//   - Criterio 7 ("preview + modal" click/cierre) y criterio 8 (Network sin
//     URLs públicas): requieren navegador — smoke manual, no server-side.
//   - Limpieza de carpetas intermedias (media/planes-fotos/<año>/<mes>/):
//     se trashea la carpeta de cada tarea de prueba (con sus archivos
//     adentro), pero las carpetas de año/mes que quedan vacías arriba NO se
//     borran — a esta escala (2 usuarios) no vale la complejidad de subir y
//     borrar solo-si-quedan-vacías.
// ============================================================

function probarMEDIA002() {
  const R = nuevoReporte('REQ-MEDIA-002');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  let scratchId = null;
  const driveFileIdsCreados = [];
  const driveFolderIdsCreados = [];

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarMEDIA002 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);

    sembrarEstadoMedia002(ss);

    const planId  = grupoGateCompletarSinFoto(R);
    const contexto = planId
      ? grupoPrimeraFotoCreaCarpeta(R, planId, driveFileIdsCreados, driveFolderIdsCreados)
      : null;

    if (contexto) {
      grupoSegundaFotoMismaCarpeta(R, contexto, driveFileIdsCreados);
      grupoEditarTituloNoRenombraCarpeta(R, contexto, driveFileIdsCreados);
      grupoCompletarConFoto(R, contexto);
    } else {
      R.fail('MEDIA-002 · no se pudo crear la carpeta de la primera foto — se saltan los grupos que dependen de ella');
    }

    grupoFalloParcialSubidaMultiple(R, driveFileIdsCreados, driveFolderIdsCreados);
    grupoGetArchivosBatch(R, driveFileIdsCreados, driveFolderIdsCreados);
    grupoRecentPlanPhotos(R);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    driveFileIdsCreados.forEach(fileId => {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch (e) {
        R.nota('no se pudo borrar de Drive el archivo de prueba ' + fileId + ' — borralo a mano: ' + e);
      }
    });
    driveFolderIdsCreados.forEach(folderId => {
      try {
        DriveApp.getFolderById(folderId).setTrashed(true); // trashea la carpeta Y los archivos que quedaran adentro
      } catch (e) {
        R.nota('no se pudo borrar de Drive la carpeta de prueba ' + folderId + ' — borrala a mano: ' + e);
      }
    });
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
// Fixture: Usuarios + 1 categoría activa ('Mantenimiento', el mismo ejemplo
// que usa el REQ), como quedaría recién después de setupSheets().
// ------------------------------------------------------------

function sembrarEstadoMedia002(ss) {
  setupSheets();

  const usuarios = ss.getSheetByName('Usuarios');
  usuarios.appendRow(['usr_fran', 'Fran', 'fran@test.local', 'sub-fran', '', '']);
  usuarios.appendRow(['usr_noe',  'Noe',  'noe@test.local',  'sub-noe',  '', '']);

  const categorias = ss.getSheetByName('Categorias');
  categorias.appendRow(CATEGORIAS_HEADERS.map(c => {
    switch (c) {
      case 'categoria_id':   return 'cat_mant';
      case 'nombre':         return 'Mantenimiento';
      case 'color_hex':      return '#0ea5e9';
      case 'creado_por':     return 'usr_fran';
      case 'fecha_creacion': return new Date().toISOString();
      case 'estado':         return 'activa';
      default:               return '';
    }
  }));

  const nombresMios = ['Usuarios', 'Categorias', 'Planes', 'Archivos', 'Sesiones', 'Auditoria'];
  ss.getSheets().forEach(sh => {
    if (nombresMios.indexOf(sh.getName()) === -1) ss.deleteSheet(sh);
  });
  SpreadsheetApp.flush();
}

// ------------------------------------------------------------
// Grupos de verificación (criterios de REQ-MEDIA-002)
// ------------------------------------------------------------

// Criterios 1 y 1b — sin fotos, completePlan da 400/FOTO_REQUERIDA, el plan
// sigue pendiente, y no se cachea ninguna carpeta (todavía no se creó nada
// en Drive). Devuelve el planId para que los grupos siguientes le suban la
// primera foto.
function grupoGateCompletarSinFoto(R) {
  const crear = parseResp(handleCreatePlan({
    titulo: 'Arreglar el techo', categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-01',
  }));
  R.eq('MEDIA-002 setup · createPlan -> 200', crear.status, 200);
  if (crear.status !== 200) return null;
  const planId = crear.planId;

  darAcuerdosDeLosDos(planId); // REQ-PLAN-001: sin acuerdo respondería ACUERDO_PENDIENTE antes
  const comp = parseResp(handleCompletePlan({ planId: planId, authUserId: 'usr_fran' }));
  R.eq('C1 · completePlan sin fotos -> 400', comp.status, 400);
  R.eq('C1 · completePlan sin fotos -> code FOTO_REQUERIDA', comp.code, 'FOTO_REQUERIDA');

  const fila = filaPorId('Planes', planId);
  R.eq('C1 · el plan sigue pendiente (no se completó)', fila[col('Planes', 'estado')], 'pendiente');
  R.check('C1b · sin fotos no se cacheó ninguna carpeta en el plan',
          !fila[col('Planes', 'carpeta_fotos_drive_id')]);

  return planId;
}

// Criterio 2 (+ parte del 4) — la primera foto crea la carpeta, recién ahí,
// con el nombre esperado (fecha-categoría-título-sufijo) y numerada 0001.
// Devuelve el contexto (planId + carpetaId + primer archivoId) para los
// grupos siguientes.
function grupoPrimeraFotoCreaCarpeta(R, planId, driveFileIdsCreados, driveFolderIdsCreados) {
  const subida = parseResp(handleUploadPlanPhotos({
    planId: planId,
    files: [{ fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' }],
    authUserId: 'usr_fran',
  }));
  R.eq('C2 · uploadPlanPhotos (1ra foto) -> 200', subida.status, 200);
  R.eq('C2 · 1ra foto sin errores', (subida.errores || []).length, 0);
  if (!subida.subidas || subida.subidas.length !== 1) {
    R.fail('MEDIA-002 · la primera foto no se subió — se saltan los grupos dependientes');
    return null;
  }
  driveFileIdsCreados.push(subida.subidas[0].driveFileId);

  const filaTrasPrimera = filaPorId('Planes', planId);
  R.eq('C2 · la tarea sigue pendiente tras subir 1 foto (subir no completa sola)',
       filaTrasPrimera[col('Planes', 'estado')], 'pendiente');

  const carpetaId = filaTrasPrimera[col('Planes', 'carpeta_fotos_drive_id')];
  R.check('C2 · se cacheó el ID de carpeta en el plan tras la 1ra foto', !!carpetaId);
  if (!carpetaId) return null;
  driveFolderIdsCreados.push(carpetaId);

  // Nombre y ubicación exactos esperados, calculados con los mismos helpers
  // que usa handleUploadPlanPhotos (Code.gs) — si alguno cambia de criterio
  // más adelante, este test lo va a notar solo.
  // REQ-MEDIA-005 (DEC-005): la carpeta lleva el día de inicio de la tarea
  // (fechaProgramada '2026-10-01', ver grupoGateCompletarSinFoto), no el de
  // la primera subida.
  const fechaHoyIso = '2026-10-01';
  const [anioEsperado, mesEsperado] = fechaHoyIso.split('-');
  const sufijoEsperado = planId.split('_').pop().slice(-6);
  const nombreEsperado = formatFechaDDMMAAAA(fechaHoyIso) + '-mantenimiento-arreglar-el-techo-' + sufijoEsperado;

  const carpeta = DriveApp.getFolderById(carpetaId);
  R.eq('C2 · nombre de carpeta sigue el patrón fecha-categoría-título-sufijo',
       carpeta.getName(), nombreEsperado);

  const carpetaMes = carpeta.getParents().hasNext() ? carpeta.getParents().next() : null;
  R.check('C2 · la carpeta cuelga de una carpeta de mes', !!carpetaMes);
  if (carpetaMes) {
    R.eq('C2 · el mes de la carpeta es el correcto', carpetaMes.getName(), NOMBRES_MES[Number(mesEsperado) - 1]);
    const carpetaAnio = carpetaMes.getParents().hasNext() ? carpetaMes.getParents().next() : null;
    R.check('C2 · la carpeta de mes cuelga de una carpeta de año', !!carpetaAnio);
    if (carpetaAnio) {
      R.eq('C2 · el año de la carpeta es el correcto', carpetaAnio.getName(), anioEsperado);
    }
  }

  const archivo = getArchivoRow(subida.subidas[0].archivoId);
  R.check('C4 · el primer archivo queda numerado 0001',
          !!archivo && DriveApp.getFileById(archivo.drive_file_id).getName().indexOf('0001-') === 0);

  return { planId: planId, carpetaId: carpetaId };
}

// Criterio 4 — subir una segunda foto NO crea carpeta nueva ni la renombra,
// y queda numerada 0002 en la misma carpeta (2 archivos, no más).
function grupoSegundaFotoMismaCarpeta(R, contexto, driveFileIdsCreados) {
  const subida2 = parseResp(handleUploadPlanPhotos({
    planId: contexto.planId,
    files: [{ fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' }],
    authUserId: 'usr_noe',
  }));
  R.eq('C4 · uploadPlanPhotos (2da foto) -> 200', subida2.status, 200);
  if (!subida2.subidas || subida2.subidas.length !== 1) {
    R.fail('MEDIA-002 · la segunda foto no se subió — se saltan sus aserciones');
    return;
  }
  driveFileIdsCreados.push(subida2.subidas[0].driveFileId);

  const filaTrasSegunda = filaPorId('Planes', contexto.planId);
  R.eq('C4 · la carpeta cacheada NO cambia con la 2da foto',
       filaTrasSegunda[col('Planes', 'carpeta_fotos_drive_id')], contexto.carpetaId);

  const archivo2 = getArchivoRow(subida2.subidas[0].archivoId);
  R.check('C4 · el segundo archivo queda numerado 0002',
          !!archivo2 && DriveApp.getFileById(archivo2.drive_file_id).getName().indexOf('0002-') === 0);

  const cantidadEnCarpeta = contarArchivosEnCarpeta(DriveApp.getFolderById(contexto.carpetaId));
  R.eq('C4 · la carpeta tiene exactamente 2 archivos (no se duplicó)', cantidadEnCarpeta, 2);
}

// Criterio 5 — editar el título de la tarea NO mueve ni renombra su carpeta;
// una foto subida después de la edición sigue cayendo en la carpeta vieja.
function grupoEditarTituloNoRenombraCarpeta(R, contexto, driveFileIdsCreados) {
  const update = parseResp(handleUpdatePlan({
    planId: contexto.planId, titulo: 'Arreglar el techo (urgente)', authUserId: 'usr_fran',
  }));
  R.eq('C5 setup · updatePlan (cambiar título) -> 200', update.status, 200);

  const subida3 = parseResp(handleUploadPlanPhotos({
    planId: contexto.planId,
    files: [{ fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' }],
    authUserId: 'usr_fran',
  }));
  R.eq('C5 · uploadPlanPhotos tras editar título -> 200', subida3.status, 200);
  if (!subida3.subidas || subida3.subidas.length !== 1) {
    R.fail('MEDIA-002 · la foto post-edición no se subió');
    return;
  }
  driveFileIdsCreados.push(subida3.subidas[0].driveFileId);

  const filaTrasEditar = filaPorId('Planes', contexto.planId);
  R.eq('C5 · la carpeta cacheada sigue siendo la misma tras editar el título',
       filaTrasEditar[col('Planes', 'carpeta_fotos_drive_id')], contexto.carpetaId);

  const carpeta = DriveApp.getFolderById(contexto.carpetaId);
  R.check('C5 · el nombre de la carpeta sigue con el título viejo (congelado)',
          carpeta.getName().indexOf('arreglar-el-techo') !== -1 && carpeta.getName().indexOf('urgente') === -1);
}

// Criterio 3 — con al menos 1 foto activa, completePlan funciona igual que
// antes de este REQ.
function grupoCompletarConFoto(R, contexto) {
  darAcuerdosDeLosDos(contexto.planId); // REQ-PLAN-001
  const comp = parseResp(handleCompletePlan({ planId: contexto.planId, authUserId: 'usr_noe' }));
  R.eq('C3 · completePlan con fotos -> 200', comp.status, 200);
  const fila = filaPorId('Planes', contexto.planId);
  R.eq('C3 · estado = completado', fila[col('Planes', 'estado')], 'completado');
}

// Criterios 10 y 11 — selección múltiple: la foto inválida en el medio de 3
// no descarta las otras 2, que quedan numeradas 0001/0002 sin huecos, y el
// error reportado señala el índice correcto dentro del arreglo original.
function grupoFalloParcialSubidaMultiple(R, driveFileIdsCreados, driveFolderIdsCreados) {
  const crear = parseResp(handleCreatePlan({
    titulo: 'Pintar la reja', categoriaId: 'cat_mant', userId: 'usr_noe', fechaProgramada: '2026-10-05',
  }));
  R.eq('C10/C11 setup · createPlan -> 200', crear.status, 200);
  if (crear.status !== 200) return;
  const planId = crear.planId;

  const subida = parseResp(handleUploadPlanPhotos({
    planId: planId,
    files: [
      { fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' },
      { fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'application/pdf' }, // mime no permitido, a propósito
      { fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' },
    ],
    authUserId: 'usr_noe',
  }));
  R.eq('C11 · uploadPlanPhotos con 1 foto inválida en el medio sigue -> 200', subida.status, 200);
  R.eq('C11 · las 2 fotos válidas se subieron igual', (subida.subidas || []).length, 2);
  R.eq('C11 · se reportó exactamente 1 error', (subida.errores || []).length, 1);
  R.check('C11 · el error señala el índice 1 (la del medio)',
          !!subida.errores && subida.errores[0] && subida.errores[0].index === 1);

  (subida.subidas || []).forEach(s => driveFileIdsCreados.push(s.driveFileId));

  const filaPlan = filaPorId('Planes', planId);
  const carpetaId = filaPlan[col('Planes', 'carpeta_fotos_drive_id')];
  if (carpetaId) driveFolderIdsCreados.push(carpetaId);

  const numeros = (subida.subidas || [])
    .map(s => DriveApp.getFileById(s.driveFileId).getName().slice(0, 4))
    .join(',');
  R.eq('C10 · las 2 fotos válidas quedan numeradas correlativamente sin huecos (0001,0002)',
       numeros, '0001,0002');

  R.eq('C11 · las 2 fotos válidas quedan activas en Archivos', contarFotosActivasPlan(planId), 2);
}

// REQ-PERF-001 criterios 2 y 3 — getArchivos (batch) trae varios archivos en
// una sola invocación y un archivoId inexistente viene con `error` en su
// propia entrada, sin tirar abajo el resto de la respuesta. No existía un
// test permanente para esto (quedó anotado como pendiente en REQ-PERF-001);
// se agrega acá mismo porque ya usa el fixture de tarea+foto de este REQ.
function grupoGetArchivosBatch(R, driveFileIdsCreados, driveFolderIdsCreados) {
  const crear = parseResp(handleCreatePlan({
    titulo: 'Podar el jardín', categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-06',
  }));
  R.eq('PERF-001 setup · createPlan -> 200', crear.status, 200);
  if (crear.status !== 200) return;

  const subida = parseResp(handleUploadPlanPhotos({
    planId: crear.planId,
    files: [
      { fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' },
      { fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' },
    ],
    authUserId: 'usr_fran',
  }));
  R.eq('PERF-001 setup · uploadPlanPhotos (2 fotos) -> 200', subida.status, 200);
  if (!subida.subidas || subida.subidas.length !== 2) {
    R.fail('PERF-001 · no se pudieron subir las fotos de fixture — se salta el grupo getArchivos');
    return;
  }
  subida.subidas.forEach(s => driveFileIdsCreados.push(s.driveFileId));
  const filaPlan = filaPorId('Planes', crear.planId);
  const carpetaId = filaPlan[col('Planes', 'carpeta_fotos_drive_id')];
  if (carpetaId) driveFolderIdsCreados.push(carpetaId);

  const [idA, idB] = subida.subidas.map(s => s.archivoId);
  const idInexistente = 'arc_no_existe_999999';

  const batch = parseResp(handleGetArchivos({ archivoIds: [idA, idInexistente, idB] }));
  R.eq('C2 · getArchivos (batch) -> 200', batch.status, 200);
  R.eq('C2 · devuelve una entrada por cada archivoId pedido (3)', (batch.archivos || []).length, 3);

  const porId = new Map((batch.archivos || []).map(a => [a.archivoId, a]));
  const entradaA = porId.get(idA);
  const entradaB = porId.get(idB);
  const entradaInexistente = porId.get(idInexistente);

  R.check('C2 · el 1er archivo válido viene con base64 y sin error', !!entradaA && !entradaA.error && !!entradaA.base64);
  R.check('C2 · el 2do archivo válido viene con base64 y sin error', !!entradaB && !entradaB.error && !!entradaB.base64);
  R.check('C3 · el archivoId inexistente viene con error, no rompe el resto', !!entradaInexistente && !!entradaInexistente.error);
}

// Criterio 6 (parte de datos, sin frontend) — getRecentPlanPhotos devuelve
// título/categoría/fecha correctos por foto, para las fotos que ya se
// subieron en los grupos anteriores.
function grupoRecentPlanPhotos(R) {
  const fotos = parseResp(handleGetRecentPlanPhotos({ limit: 50 }));
  R.eq('C6 · getRecentPlanPhotos -> 200', fotos.status, 200);
  R.check('C6 · devuelve al menos las fotos subidas en esta corrida', (fotos.fotos || []).length >= 2);

  const todasConDatos = (fotos.fotos || []).every(f => f.tituloPlan && f.categoriaNombre && f.fecha);
  R.check('C6 · cada foto trae tituloPlan/categoriaNombre/fecha', todasConDatos);

  const deLaReja = (fotos.fotos || []).find(f => (f.tituloPlan || '').indexOf('Pintar la reja') !== -1);
  R.check('C6 · la foto de "Pintar la reja" trae categoría "Mantenimiento"',
          !!deLaReja && deLaReja.categoriaNombre === 'Mantenimiento');
}

// ============================================================
// probarBUGCARGA001() — BUG-CARGA-001 fase 1, criterios 4 y 5 (parte
// servidor): una excepción dentro de doPost responde 500 con un código corto
// para cruzar con el log, y sin filtrar mensaje/stack al cliente.
// No toca ninguna planilla: los dos casos fallan antes de leer datos.
//
// Uso (Duck):  clasp push -f -P .clasp-test.json -I .claspignore-test
//              clasp run probarBUGCARGA001 -P .clasp-test.json -u duck
// El console.error de cada caso se verifica a ojo en Ejecuciones (test).
// ============================================================
function probarBUGCARGA001() {
  const R = nuevoReporte('BUG-CARGA-001');
  const formatoCodigo = /^E-[0-9A-F]{6}$/;

  const casos = [
    { desc: 'body no-JSON',        evento: { postData: { contents: '{esto no es json' } } },
    { desc: 'evento sin postData', evento: {} },
  ];
  const codigos = [];

  casos.forEach(function (c) {
    const resp = parseResp(doPost(c.evento));
    R.eq('C4 · ' + c.desc + ' -> 500', resp.status, 500);
    R.check('C4 · ' + c.desc + ' -> trae codigo con formato E-XXXXXX', formatoCodigo.test(resp.codigo || ''));
    R.eq('C5 · ' + c.desc + ' -> mensaje genérico', resp.error, 'Error interno del servidor.');
    R.eq('C5 · ' + c.desc + ' -> solo status/error/codigo (sin stack ni detalle)',
         Object.keys(resp).sort().join(','), 'codigo,error,status');
    codigos.push(resp.codigo);
  });

  R.check('C4 · dos errores distintos dan códigos distintos', codigos[0] !== codigos[1]);
  R.nota('Códigos generados en esta corrida (buscarlos en Ejecuciones): ' + codigos.join(', '));
  return R.finalizar();
}

// ============================================================
// probarBL015() — BL-015: sacar a alguien de Usuarios corta sus sesiones
// abiertas. Todo entra por doPost() (el chequeo vive en el router, después
// de validarSesion), con sesiones reales de crearSesion().
//
// Uso (Duck):  clasp push -f -P .clasp-test.json -I .claspignore-test
//              clasp run probarBL015 -P .clasp-test.json -u duck
//
// Crea su planilla scratch y la borra al terminar. Limpia las claves de
// CacheService que genera (sesion:*, sesion-ok:*, hoja:<scratch>:*).
// La demora real de una baja hecha a mano (caché de Usuarios, 30 s) no se
// prueba esperando: el test invalida el caché como lo haría ese TTL.
// ============================================================
function probarBL015() {
  const R = nuevoReporte('BL-015');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const sesionesCreadas = [];
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarBL015 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);

    setupSheets();
    const mias = ['Usuarios', 'Categorias', 'Planes', 'Archivos', 'Sesiones', 'Auditoria'];
    ss.getSheets().forEach(sh => {
      if (mias.indexOf(sh.getName()) === -1) ss.deleteSheet(sh);
    });
    const usuarios = getSheet(SHEETS.USUARIOS);
    usuarios.appendRow(['usr_fran', 'Fran', 'fran@test.local', 'sub-fran', '', '']);
    usuarios.appendRow(['usr_noe',  'Noe',  'noe@test.local',  'sub-noe',  '', '']);
    usuarios.appendRow(['usr_ex',   'Ex',   'ex@test.local',   'sub-ex',   '', '']);
    SpreadsheetApp.flush();
    invalidarCacheHoja(SHEETS.USUARIOS);

    const sesion = userId => {
      const t = crearSesion(userId);
      sesionesCreadas.push(t.split('.')[0]);
      return t;
    };
    const pedir = (action, token) => parseResp(doPost({
      postData: { contents: JSON.stringify({ action: action, sessionToken: token }) },
    }));
    const bajaYRefrescar = () => { SpreadsheetApp.flush(); invalidarCacheHoja(SHEETS.USUARIOS); };

    // Caso permitido: usuario en la lista blanca.
    const tFran = sesion('usr_fran');
    R.eq('P1 · usuario habilitado -> getCategorias 200', pedir('getCategorias', tFran).status, 200);

    // Baja borrando la fila, con la sesión ya validada (fast-path de 90 s cargado).
    const tNoe = sesion('usr_noe');
    R.eq('D1 · antes de la baja -> 200', pedir('getPlanes', tNoe).status, 200);
    const filaNoe = filasDe(SHEETS.USUARIOS).findIndex(f => f[0] === 'usr_noe');
    usuarios.deleteRow(filaNoe + 2);
    bajaYRefrescar();
    const r1 = pedir('getPlanes', tNoe);
    R.eq('D1 · fila borrada -> 401', r1.status, 401);
    R.eq('D1 · mensaje genérico, sin pista de la baja', r1.error, 'Sesión inválida o expirada.');
    R.eq('D1 · segundo pedido (fast-path cargado) -> 401', pedir('getCategorias', tNoe).status, 401);
    R.eq('D1 · getUser también -> 401', pedir('getUser', tNoe).status, 401);
    R.eq('D1 · logout de una cuenta dada de baja sigue respondiendo 200',
         pedir('logout', tNoe).status, 200);

    // Baja vaciando el email (el login ya no la dejaría entrar).
    const tEx = sesion('usr_ex');
    R.eq('D2 · antes de vaciar el email -> 200', pedir('getCategorias', tEx).status, 200);
    const filaEx = filasDe(SHEETS.USUARIOS).findIndex(f => f[0] === 'usr_ex');
    usuarios.getRange(filaEx + 2, col(SHEETS.USUARIOS, 'email') + 1).setValue('');
    bajaYRefrescar();
    R.eq('D2 · email vacío -> 401', pedir('getCategorias', tEx).status, 401);

    // Sesión de un usuario que nunca estuvo en Usuarios.
    const tFantasma = sesion('usr_fantasma');
    R.eq('D3 · usuario sin fila -> 401', pedir('getCategorias', tFantasma).status, 401);

    // El resto sigue andando: la baja de uno no toca al otro.
    R.eq('P2 · el usuario habilitado sigue con 200', pedir('getPlanes', tFran).status, 200);

    // Comportamiento documentado (fuera de alcance): si la fila vuelve, la
    // sesión que no venció vuelve a andar. No se revoca en Sesiones.
    usuarios.getRange(filaEx + 2, col(SHEETS.USUARIOS, 'email') + 1).setValue('ex@test.local');
    bajaYRefrescar();
    R.eq('N1 · re-alta: la sesión sin vencer vuelve a andar (esperado, ver BL-015)',
         pedir('getCategorias', tEx).status, 200);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) {
        claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      }
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
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


// ============================================================
// probarBUGFECHA001() — BUG-FECHA-001: "hoy" en hora Argentina, no en UTC.
// La planilla scratch se pone en hora Argentina, como la de prod, para
// confirmar que formatDate() lee sin correrse las dos formas de fecha que
// conviven en la hoja (ver su comentario en Code.gs). El reloj se fija con
// RELOJ_OVERRIDE para simular una subida a las 22:30 del 30/09.
// Uso: clasp run probarBUGFECHA001 -P .clasp-test.json -u duck
// ============================================================
function probarBUGFECHA001() {
  const R = nuevoReporte('BUG-FECHA-001');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const relojAnterior = RELOJ_OVERRIDE;
  let scratchId = null;
  const driveFileIdsCreados = [];
  const driveFolderIdsCreados = [];

  try {
    // A — el día de un instante, en hora Argentina.
    R.eq('A · 28/09 01:30Z (27/09 22:30 AR) -> 2026-09-27',
         fechaDiaArgentina(new Date('2026-09-28T01:30:00Z')), '2026-09-27');
    R.eq('A · 27/09 15:00Z -> 2026-09-27',
         fechaDiaArgentina(new Date('2026-09-27T15:00:00Z')), '2026-09-27');
    R.eq('A · 01/10 01:30Z (30/09 22:30 AR) -> 2026-09-30',
         fechaDiaArgentina(new Date('2026-10-01T01:30:00Z')), '2026-09-30');
    R.eq('A · 01/10 03:00Z (01/10 00:00 AR) -> 2026-10-01',
         fechaDiaArgentina(new Date('2026-10-01T03:00:00Z')), '2026-10-01');

    const ss = SpreadsheetApp.create('SCRATCH probarBUGFECHA001 ' + new Date().toISOString());
    scratchId = ss.getId();
    ss.setSpreadsheetTimeZone(TZ_APP);
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);
    sembrarEstadoMedia002(ss);

    // B — formatDate() lee una fecha editada a mano sin correrla.
    const hojaTmp = ss.insertSheet('tmp');
    hojaTmp.getRange(1, 1).setValue('2026-10-01');
    SpreadsheetApp.flush();
    const nativa = hojaTmp.getRange(1, 1).getValue();
    R.check('B · Sheets convirtió el texto en fecha nativa', nativa instanceof Date);
    R.eq('B · formatDate(fecha editada a mano en la planilla) -> 2026-10-01', formatDate(nativa), '2026-10-01');
    R.eq('B · formatDate(texto AAAA-MM-DD) sin cambios', formatDate('2026-10-01'), '2026-10-01');
    ss.deleteSheet(hojaTmp);

    // C — primera foto de una tarea subida el 30/09 a las 22:30 hora Argentina.
    const crear = parseResp(handleCreatePlan({
      titulo: 'Cena de fin de mes', categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-09-30',
    }));
    R.eq('C setup · createPlan -> 200', crear.status, 200);
    R.eq('C setup · fechaProgramada (medianoche UTC en la hoja) no se corre',
         formatDate(filaPorId('Planes', crear.planId)[col('Planes', 'fecha_programada')]), '2026-09-30');

    RELOJ_OVERRIDE = '2026-10-01T01:30:00Z';
    const subida = parseResp(handleUploadPlanPhotos({
      planId: crear.planId,
      files: [{ fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' }],
      authUserId: 'usr_noe',
    }));
    RELOJ_OVERRIDE = relojAnterior;
    R.eq('C · uploadPlanPhotos -> 200', subida.status, 200);

    const carpetaId = filaPorId('Planes', crear.planId)[col('Planes', 'carpeta_fotos_drive_id')];
    if (carpetaId) driveFolderIdsCreados.push(carpetaId);
    if (subida.subidas && subida.subidas.length === 1) {
      driveFileIdsCreados.push(subida.subidas[0].driveFileId);
      const fila = filaPorId('Archivos', subida.subidas[0].archivoId);
      R.eq('C1 · fecha_contenido es el día argentino (30/09), no el UTC (01/10)',
           formatDate(fila[col('Archivos', 'fecha_contenido')]), '2026-09-30');
      const nombre = DriveApp.getFileById(subida.subidas[0].driveFileId).getName();
      R.check('C2 · el nombre del archivo lleva 30-09-2026 (' + nombre + ')', nombre.indexOf('0001-30-09-2026-') === 0);
      R.check('C4 · fecha_subida sigue en ISO UTC con Z',
              ISO_UTC.test(String(fila[col('Archivos', 'fecha_subida')])));
    } else {
      R.fail('C · la foto no se subió: ' + JSON.stringify(subida));
    }

    if (carpetaId) {
      const carpeta = DriveApp.getFolderById(carpetaId);
      R.check('C3 · la carpeta se llama 30-09-2026-… (' + carpeta.getName() + ')',
              carpeta.getName().indexOf('30-09-2026-') === 0);
      const mes = carpeta.getParents().next();
      R.eq('C3 · la carpeta cuelga de Septiembre, no de Octubre', mes.getName(), 'Septiembre');
      R.eq('C3 · y del año 2026', mes.getParents().next().getName(), '2026');
    } else {
      R.fail('C3 · no se cacheó la carpeta de la tarea');
    }

    // D — corrección de filas ya grabadas (criterios 6 y 7).
    const archivos = getSheet(SHEETS.ARCHIVOS);
    const filaArchivo = (id, subidaIso, contenido) => ARCHIVOS_HEADERS.map(c => {
      switch (c) {
        case 'archivo_id':      return id;
        case 'owner_tipo':      return 'plan';
        case 'owner_id':        return crear.planId;
        case 'proposito':       return 'adjunto';
        case 'fecha_contenido': return contenido;
        case 'drive_file_id':   return 'drive_fake_' + id;
        case 'fecha_subida':    return subidaIso;
        case 'estado':          return 'activo';
        default:                return '';
      }
    });
    archivos.appendRow(filaArchivo('arc_noche',       '2026-09-28T01:30:00.000Z', '2026-09-28'));
    archivos.appendRow(filaArchivo('arc_tarde',       '2026-09-27T15:00:00.000Z', '2026-09-27'));
    archivos.appendRow(filaArchivo('arc_a_proposito', '2026-09-28T01:30:00.000Z', '2026-09-20'));
    SpreadsheetApp.flush();

    const contenidoDe = id => formatDate(filaPorId('Archivos', id)[col('Archivos', 'fecha_contenido')]);
    const r1 = corregirFechaContenidoArchivos();
    const idsCorregidos = r1.cambios.map(c => c.archivoId);
    R.eq('C6 · la foto de las 22:30 pasa a 2026-09-27', contenidoDe('arc_noche'), '2026-09-27');
    R.eq('C6 · la de las 12:00 AR no cambia', contenidoDe('arc_tarde'), '2026-09-27');
    R.eq('C6 · una fecha puesta a propósito no se pisa', contenidoDe('arc_a_proposito'), '2026-09-20');
    R.eq('C6 · solo se corrigió arc_noche', JSON.stringify(idsCorregidos), JSON.stringify(['arc_noche']));
    R.eq('C7 · la segunda corrida no cambia nada', corregirFechaContenidoArchivos().corregidas, 0);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    RELOJ_OVERRIDE = relojAnterior;
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    driveFileIdsCreados.forEach(fileId => {
      try { DriveApp.getFileById(fileId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar de Drive el archivo de prueba ' + fileId + ' — borralo a mano: ' + e); }
    });
    driveFolderIdsCreados.forEach(folderId => {
      try { DriveApp.getFolderById(folderId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar de Drive la carpeta de prueba ' + folderId + ' — borrala a mano: ' + e); }
    });
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e); }
    }
  }

  return R.finalizar();
}


// ============================================================
// probarPLAN001() — REQ-PLAN-001: cerrar una tarea requiere el acuerdo de
// todos los habilitados, cada uno cambia solo el suyo, reabrir los borra.
// Uso: clasp run probarPLAN001 -P .clasp-test.json -u duck
// ============================================================
function probarPLAN001() {
  const R = nuevoReporte('REQ-PLAN-001');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const sesionesCreadas = [];
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarPLAN001 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);
    sembrarEstadoMedia002(ss);
    invalidarCacheHoja(SHEETS.USUARIOS);

    const acuerdo = (planId, u, si) => parseResp(handleSetAcuerdoCierre({ planId: planId, deAcuerdo: si, authUserId: u }));
    const completar = (planId, u) => parseResp(handleCompletePlan({ planId: planId, authUserId: u }));
    const planDe = planId => parseResp(handleGetPlanes({})).planes.filter(p => p.planId === planId)[0];
    const conFoto = planId => insertArchivo({
      ownerTipo: 'plan', ownerId: planId, proposito: 'adjunto',
      driveFileId: 'fake-drive-plan001', mimeType: 'image/png', tamanoBytes: 1,
      subidoPor: 'usr_fran', estado: 'activo',
    });
    const crear = titulo => parseResp(handleCreatePlan({
      titulo: titulo, categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-01',
    })).planId;
    const auditoria = accion => filasDe('Auditoria').filter(r => r[col('Auditoria', 'accion')] === accion);

    // Esquema y lectura inicial.
    R.check('S · Planes tiene acuerdos_cierre, fecha_completado y completado_por',
            ['acuerdos_cierre', 'fecha_completado', 'completado_por'].every(c => col('Planes', c) !== -1));
    const p1 = crear('Cena en el puerto');
    conFoto(p1);
    const g0 = parseResp(handleGetPlanes({}));
    R.eq('S · getPlanes devuelve participantes', JSON.stringify(g0.participantes), JSON.stringify(['usr_fran', 'usr_noe']));
    R.eq('S · una tarea nueva arranca sin acuerdos', JSON.stringify(planDe(p1).acuerdos), '[]');

    // C1 / C6 — con un solo acuerdo no se cierra, aunque tenga foto.
    R.eq('C1 · Franco da su acuerdo -> 200', acuerdo(p1, 'usr_fran', true).status, 200);
    R.eq('C1 · getPlanes muestra el acuerdo de Franco', JSON.stringify(planDe(p1).acuerdos), JSON.stringify(['usr_fran']));
    const c6 = completar(p1, 'usr_fran');
    R.eq('C6 · completePlan con 1 de 2 -> 409', c6.status, 409);
    R.eq('C6 · code ACUERDO_PENDIENTE', c6.code, 'ACUERDO_PENDIENTE');
    R.eq('C6 · dice a quién le falta', c6.error, 'Falta que Noe esté de acuerdo para cerrar la tarea.');
    R.eq('C6 · faltan = [usr_noe]', JSON.stringify(c6.faltan), JSON.stringify(['usr_noe']));
    R.eq('C6 · la tarea sigue pendiente', filaPorId('Planes', p1)[col('Planes', 'estado')], 'pendiente');

    // Idempotencia: dar el acuerdo dos veces no lo duplica ni audita de más.
    acuerdo(p1, 'usr_fran', true);
    R.eq('S · dar el acuerdo dos veces no lo duplica', filaPorId('Planes', p1)[col('Planes', 'acuerdos_cierre')], 'usr_fran');

    // C3 — sacar el acuerdo.
    R.eq('C3 · Franco saca su acuerdo -> 200', acuerdo(p1, 'usr_fran', false).status, 200);
    R.eq('C3 · sin acuerdos', JSON.stringify(planDe(p1).acuerdos), '[]');
    R.eq('C3 · sin nadie de acuerdo: faltan los dos', completar(p1, 'usr_noe').error,
         'Falta que Fran y Noe estén de acuerdo para cerrar la tarea.');

    // C2 / C5 — con los dos, se cierra y registra quién y cuándo.
    acuerdo(p1, 'usr_fran', true);
    acuerdo(p1, 'usr_noe', true);
    R.eq('C2 · los dos de acuerdo', JSON.stringify(planDe(p1).acuerdos), JSON.stringify(['usr_fran', 'usr_noe']));
    R.eq('C5 · completePlan con los dos y foto -> 200', completar(p1, 'usr_noe').status, 200);
    const f5 = filaPorId('Planes', p1);
    R.eq('C5 · estado completado', f5[col('Planes', 'estado')], 'completado');
    R.eq('C5 · completado_por', f5[col('Planes', 'completado_por')], 'usr_noe');
    R.check('C5 · fecha_completado en ISO UTC', ISO_UTC.test(String(f5[col('Planes', 'fecha_completado')])));
    R.eq('C5 · al completar se vacían los acuerdos', f5[col('Planes', 'acuerdos_cierre')], '');
    const g5 = planDe(p1);
    R.eq('C5 · getPlanes expone completadoPor', g5.completadoPor, 'usr_noe');
    R.check('C5 · getPlanes expone fechaCompletado', !!g5.fechaCompletado);
    R.eq('S · completar de nuevo -> 409 NO_PENDIENTE', completar(p1, 'usr_fran').code, 'NO_PENDIENTE');
    R.eq('S · dar acuerdo en una completada -> 409', acuerdo(p1, 'usr_fran', true).status, 409);

    // C4 — los dos de acuerdo y sin fotos: FOTO_REQUERIDA, sigue pendiente.
    const p2 = crear('Sin fotos');
    acuerdo(p2, 'usr_fran', true);
    acuerdo(p2, 'usr_noe', true);
    const c4 = completar(p2, 'usr_fran');
    R.eq('C4 · los dos y 0 fotos -> FOTO_REQUERIDA', c4.code, 'FOTO_REQUERIDA');
    R.eq('C4 · sigue pendiente con los acuerdos', filaPorId('Planes', p2)[col('Planes', 'acuerdos_cierre')], 'usr_fran,usr_noe');

    // C11 / C12 — reabrir.
    R.eq('C12 · reabrir una pendiente -> 409 NO_COMPLETADA',
         parseResp(handleReopenPlan({ planId: p2, authUserId: 'usr_fran' })).code, 'NO_COMPLETADA');
    R.eq('C11 · reabrir la completada -> 200', parseResp(handleReopenPlan({ planId: p1, authUserId: 'usr_fran' })).status, 200);
    const f11 = filaPorId('Planes', p1);
    R.eq('C11 · vuelve a pendiente', f11[col('Planes', 'estado')], 'pendiente');
    R.eq('C11 · sin acuerdos', f11[col('Planes', 'acuerdos_cierre')], '');
    R.eq('C11 · la foto sigue activa', contarFotosActivasPlan(p1), 1);
    R.eq('C11 · cerrarla de nuevo pide los acuerdos', completar(p1, 'usr_fran').code, 'ACUERDO_PENDIENTE');

    // C8 — reabierta A MANO en la hoja: también arranca sin acuerdos.
    acuerdo(p1, 'usr_fran', true);
    acuerdo(p1, 'usr_noe', true);
    completar(p1, 'usr_fran');
    const planes = getSheet(SHEETS.PLANES);
    const filaIdx = filasDe('Planes').findIndex(r => r[0] === p1) + 2;
    planes.getRange(filaIdx, col('Planes', 'estado') + 1).setValue('pendiente');
    SpreadsheetApp.flush();
    R.eq('C8 · reabierta en la hoja: getPlanes sin acuerdos', JSON.stringify(planDe(p1).acuerdos), '[]');
    R.eq('C8 · reabierta en la hoja: completar pide los acuerdos', completar(p1, 'usr_fran').code, 'ACUERDO_PENDIENTE');

    // C9 / C11 — auditoría.
    R.check('C9 · hay filas plan.acuerdo_dar', auditoria('plan.acuerdo_dar').length >= 4);
    R.check('C9 · hay fila plan.acuerdo_sacar', auditoria('plan.acuerdo_sacar').length === 1);
    R.check('C11 · hay fila plan.reabrir', auditoria('plan.reabrir').length === 1);
    R.check('S · hay filas plan.completar', auditoria('plan.completar').length === 2);

    // C7 — por doPost: la identidad sale de la sesión, no del body.
    const p3 = crear('Identidad');
    const tFran = crearSesion('usr_fran');
    sesionesCreadas.push(tFran.split('.')[0]);
    const pedir = (payload) => parseResp(doPost({ postData: { contents: JSON.stringify(payload) } }));
    const r7 = pedir({ action: 'setAcuerdoCierre', sessionToken: tFran, planId: p3, deAcuerdo: true,
                       userId: 'usr_noe', authUserId: 'usr_noe' });
    R.eq('C7 · setAcuerdoCierre por doPost -> 200', r7.status, 200);
    R.eq('C7 · pidiendo "como Noe" se registra el acuerdo de Fran',
         filaPorId('Planes', p3)[col('Planes', 'acuerdos_cierre')], 'usr_fran');
    R.eq('C7 · setAcuerdoCierre sin sesión -> 401',
         pedir({ action: 'setAcuerdoCierre', planId: p3, deAcuerdo: true }).status, 401);
    R.eq('C7 · reopenPlan sin sesión -> 401', pedir({ action: 'reopenPlan', planId: p3 }).status, 401);
    R.eq('S · deAcuerdo que no es booleano -> 400',
         pedir({ action: 'setAcuerdoCierre', sessionToken: tFran, planId: p3, deAcuerdo: 'si' }).status, 400);
    R.eq('S · plan inexistente -> 404', acuerdo('plan_no_existe', 'usr_fran', true).status, 404);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e); }
    }
  }

  return R.finalizar();
}


// ============================================================
// Simulación de REQ-PLAN-001 en el navegador contra el Web App de TEST.
// Prueba el front publicado con el servidor real (no un fetch simulado),
// con dos personas, sin tocar prod. Uso:
//   clasp run simPLAN001_preparar -P .clasp-test.json -u duck
//   (navegador: dos pestañas, una por sesión)
//   clasp run simPLAN001_limpiar  -P .clasp-test.json -u duck
// Usa la planilla de test (SPREADSHEET_ID del proyecto de test), no una
// scratch: el Web App no ve TEST_SPREADSHEET_ID_OVERRIDE.
// ============================================================

var SIM_USR_B = 'usr_sim_noe';

function simPLAN001_preparar() {
  const usuarios = getSheet(SHEETS.USUARIOS);
  const dataU = usuarios.getDataRange().getValues();
  const iEmail = dataU[0].indexOf('email');
  const usrA = dataU.slice(1).filter(r => String(r[iEmail] || '').trim() !== '')[0][0];
  if (!dataU.slice(1).some(r => r[0] === SIM_USR_B)) {
    usuarios.appendRow(dataU[0].map(h => ({
      usuario_id: SIM_USR_B, nombre_display: 'Noe (simulada)', email: 'sim-noe@test.local',
    })[h] || ''));
  }
  invalidarCacheHoja(SHEETS.USUARIOS);
  SpreadsheetApp.flush();

  const crear = parseResp(handleCreatePlan({
    titulo: 'SIM PLAN-001 (borrar)', categoriaId: '', userId: usrA,
    fechaProgramada: fechaDiaArgentina(new Date()),
  }));
  insertArchivo({
    ownerTipo: 'plan', ownerId: crear.planId, proposito: 'adjunto',
    driveFileId: 'fake-drive-id-sim-plan001', mimeType: 'image/png', tamanoBytes: 1,
    subidoPor: usrA, estado: 'activo',
  });

  return {
    planId: crear.planId,
    participantes: participantesCierre(),
    sesiones: [
      { userId: usrA,      sessionToken: crearSesion(usrA),      nombreDisplay: 'Testeo' },
      { userId: SIM_USR_B, sessionToken: crearSesion(SIM_USR_B), nombreDisplay: 'Noe (simulada)' },
    ],
  };
}

// Deja la planilla de test como estaba: borra la usuaria simulada, sus
// sesiones, las tareas SIM y sus archivos falsos. Devuelve la auditoría de
// esas tareas para revisar el criterio 9 antes de borrar nada de Auditoria
// (la auditoría no se borra).
function simPLAN001_limpiar() {
  const ss = abrirPlanilla();
  const planes = getSheet(SHEETS.PLANES).getDataRange().getValues();
  const iTit = planes[0].indexOf('titulo');
  const ids = planes.slice(1).filter(r => r[iTit] === 'SIM PLAN-001 (borrar)').map(r => r[0]);

  const auditoria = getSheet(SHEETS.AUDITORIA).getDataRange().getValues();
  const hA = auditoria[0];
  const auditoriaSim = auditoria.slice(1)
    .filter(r => r.some(v => ids.indexOf(String(v)) !== -1 || String(v).indexOf(SIM_USR_B) !== -1))
    .map(r => { const o = {}; hA.forEach((h, j) => { o[h] = r[j]; }); return o; });

  const borrarFilas = (nombre, pred) => {
    const sh = getSheet(nombre);
    const d = sh.getDataRange().getValues();
    let n = 0;
    for (let i = d.length - 1; i >= 1; i--) if (pred(d[i], d[0])) { sh.deleteRow(i + 1); n++; }
    return n;
  };
  const borrados = {
    planes: borrarFilas(SHEETS.PLANES, r => ids.indexOf(r[0]) !== -1),
    archivos: borrarFilas(SHEETS.ARCHIVOS, (r, h) => ids.indexOf(r[h.indexOf('owner_id')]) !== -1),
    sesionesNoe: borrarFilas(SHEETS.SESIONES, (r, h) => r[h.indexOf('usuario_id')] === SIM_USR_B),
    usuario: borrarFilas(SHEETS.USUARIOS, r => r[0] === SIM_USR_B),
  };
  invalidarCacheHoja(SHEETS.USUARIOS);
  SpreadsheetApp.flush();
  return { planIds: ids, auditoriaSim: auditoriaSim, borrados: borrados, participantes: participantesCierre() };
}


// ============================================================
// probarMEDIA004() — REQ-MEDIA-004: conteo de fotos en getPlanes y
// getFotosPlan para el bloque "Ya subidas" del modal.
//   clasp push -f -P .clasp-test.json -I .claspignore-test
//   clasp run probarMEDIA004 -P .clasp-test.json -u duck
// Planilla scratch propia, se borra al terminar.
// ============================================================

function probarMEDIA004() {
  const R = nuevoReporte('REQ-MEDIA-004');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const sesionesCreadas = [];
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarMEDIA004 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);
    sembrarEstadoMedia002(ss);
    invalidarCacheHoja(SHEETS.USUARIOS);

    const crear = titulo => parseResp(handleCreatePlan({
      titulo: titulo, categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-01',
    })).planId;
    const foto = (planId, u, estado, extra) => insertArchivo(Object.assign({
      ownerTipo: 'plan', ownerId: planId, proposito: 'adjunto',
      driveFileId: 'fake-drive-media004-' + planId, mimeType: 'image/jpeg', tamanoBytes: 1,
      subidoPor: u, estado: estado || 'activo',
    }, extra || {}));
    const planDe = planId => parseResp(handleGetPlanes({})).planes.filter(p => p.planId === planId)[0];
    const fotosDe = planId => parseResp(handleGetFotosPlan({ planId: planId }));

    const pTres = crear('Tres fotos');
    const pUna  = crear('Una foto');
    const pCero = crear('Sin fotos');
    const a1 = foto(pTres, 'usr_fran');
    const a2 = foto(pTres, 'usr_noe');
    const a3 = foto(pTres, 'usr_fran');
    foto(pTres, 'usr_noe', 'archivado');
    foto(pUna, 'usr_noe');
    // Una foto de otra tarea con el mismo dueño tipo no se mezcla.
    insertArchivo({ ownerTipo: 'usuario', ownerId: pTres, proposito: 'avatar',
                    driveFileId: 'fake-avatar', mimeType: 'image/png', tamanoBytes: 1,
                    subidoPor: 'usr_fran', estado: 'activo' });

    // C1 / C2 — conteo.
    R.eq('C1 · tarea con 3 fotos activas -> fotos = 3', planDe(pTres).fotos, 3);
    R.eq('C1 · tarea con 1 foto -> fotos = 1', planDe(pUna).fotos, 1);
    R.eq('C1 · tarea sin fotos -> fotos = 0', planDe(pCero).fotos, 0);
    R.check('C2 · la archivada y el avatar no cuentan', planDe(pTres).fotos === 3);

    // C3 — getFotosPlan.
    const g = fotosDe(pTres);
    R.eq('C3 · getFotosPlan -> 200', g.status, 200);
    R.eq('C3 · devuelve solo las 3 activas de esa tarea', g.fotos.length, 3);
    R.eq('C3 · en orden de subida, la más vieja primero',
         JSON.stringify(g.fotos.map(f => f.archivoId)), JSON.stringify([a1, a2, a3]));
    R.eq('C3 · con quién la subió', JSON.stringify(g.fotos.map(f => f.subidoPor)),
         JSON.stringify(['usr_fran', 'usr_noe', 'usr_fran']));
    R.check('C3 · con fecha AAAA-MM-DD', g.fotos.every(f => /^\d{4}-\d{2}-\d{2}$/.test(f.fechaContenido)));
    const texto = JSON.stringify(g);
    R.check('C8 · no expone el ID de Drive', texto.indexOf('fake-drive') === -1 && texto.indexOf('drive') === -1);
    R.eq('C3 · tarea sin fotos -> lista vacía', fotosDe(pCero).fotos.length, 0);

    // C4 — completada y reabierta: las fotos siguen ahí.
    darAcuerdosDeLosDos(pUna);
    parseResp(handleCompletePlan({ planId: pUna, authUserId: 'usr_fran' }));
    R.eq('C4 · completada: getFotosPlan sigue devolviendo su foto', fotosDe(pUna).fotos.length, 1);
    parseResp(handleReopenPlan({ planId: pUna, authUserId: 'usr_noe' }));
    R.eq('C4 · reabierta: su foto sigue', fotosDe(pUna).fotos.length, 1);
    R.eq('C4 · reabierta: el conteo sigue', planDe(pUna).fotos, 1);

    // Errores.
    R.eq('S · sin planId -> 400', fotosDe('').status, 400);
    R.eq('S · tarea inexistente -> 404', fotosDe('plan_no_existe').status, 404);
    parseResp(handleDeletePlan({ planId: pCero, authUserId: 'usr_fran' }));
    R.eq('S · tarea eliminada -> 404', fotosDe(pCero).status, 404);

    // C8 — por doPost: sin sesión 401, con sesión 200.
    const t = crearSesion('usr_noe');
    sesionesCreadas.push(t.split('.')[0]);
    const pedir = payload => parseResp(doPost({ postData: { contents: JSON.stringify(payload) } }));
    R.eq('C8 · getFotosPlan sin sesión -> 401', pedir({ action: 'getFotosPlan', planId: pTres }).status, 401);
    R.eq('C8 · getFotosPlan con token falso -> 401',
         pedir({ action: 'getFotosPlan', planId: pTres, sessionToken: 'ses_x.yyyy' }).status, 401);
    const conSesion = pedir({ action: 'getFotosPlan', planId: pTres, sessionToken: t });
    R.eq('C8 · getFotosPlan con sesión -> 200', conSesion.status, 200);
    R.eq('C8 · con sesión devuelve las 3', (conSesion.fotos || []).length, 3);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e); }
    }
  }

  return R.finalizar();
}


// ============================================================
// probarMEDIA005() — REQ-MEDIA-005: la foto lleva el día en que se sacó
// (validado en el servidor), se corrige a mano con setFechaFoto, y las
// tareas pueden tener un día de fin. Sube fotos reales a Drive (1 px) y las
// borra al final. "Hoy" queda fijo en el mar 13/10/2026 con RELOJ_OVERRIDE.
// Uso: clasp run probarMEDIA005 -P .clasp-test.json -u duck
// ============================================================

function probarMEDIA005() {
  const R = nuevoReporte('REQ-MEDIA-005');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const relojAnterior = RELOJ_OVERRIDE;
  const sesionesCreadas = [];
  const driveFileIdsCreados = [];
  const driveFolderIdsCreados = [];
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarMEDIA005 ' + new Date().toISOString());
    scratchId = ss.getId();
    ss.setSpreadsheetTimeZone(TZ_APP);
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);
    sembrarEstadoMedia002(ss);
    invalidarCacheHoja(SHEETS.USUARIOS);
    RELOJ_OVERRIDE = '2026-10-13T15:00:00Z'; // mar 13/10, 12:00 hora Argentina

    R.check('M · setupSheets agrega Planes.fecha_fin', col('Planes', 'fecha_fin') !== -1);
    R.check('M · setupSheets agrega Archivos.fecha_origen', col('Archivos', 'fecha_origen') !== -1);

    const crear = extra => parseResp(handleCreatePlan(Object.assign({
      titulo: 'Escapada a Tandil', categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-10',
    }, extra || {})));
    const planDe = planId => parseResp(handleGetPlanes({})).planes.filter(p => p.planId === planId)[0];
    const fotosDe = planId => parseResp(handleGetFotosPlan({ planId: planId })).fotos || [];
    const subir = (planId, archivos) => {
      const r = parseResp(handleUploadPlanPhotos({
        planId: planId,
        files: archivos.map(a => Object.assign({ fileBase64: MEDIA001_PIXEL_PNG_BASE64, mimeType: 'image/png' }, a)),
        authUserId: 'usr_noe',
      }));
      (r.subidas || []).forEach(x => driveFileIdsCreados.push(x.driveFileId));
      const carpetaId = filaPorId('Planes', planId)[col('Planes', 'carpeta_fotos_drive_id')];
      if (carpetaId && driveFolderIdsCreados.indexOf(carpetaId) === -1) driveFolderIdsCreados.push(carpetaId);
      return r;
    };
    const archivo = id => filaPorId('Archivos', id);
    const fechaDe = id => formatDate(archivo(id)[col('Archivos', 'fecha_contenido')]);
    const origenDe = id => archivo(id)[col('Archivos', 'fecha_origen')];
    const upd = body => parseResp(handleUpdatePlan(Object.assign({ authUserId: 'usr_fran' }, body)));

    // B — día de fin.
    const pUnDia = crear({ titulo: 'Cena' });
    R.eq('C6 · sin día de fin -> 200', pUnDia.status, 200);
    R.eq('C6 · sin día de fin -> fechaFin null', planDe(pUnDia.planId).fechaFin, null);
    const pViaje = crear({ fechaFin: '2026-10-12' });
    R.eq('B · con día de fin -> 200', pViaje.status, 200);
    R.eq('B · getPlanes devuelve fechaFin sin correrse', planDe(pViaje.planId).fechaFin, '2026-10-12');
    R.eq('B · fin antes del inicio -> 400', crear({ fechaFin: '2026-10-09' }).status, 400);
    R.eq('B · fin inexistente (31/02) -> 400', crear({ fechaFin: '2026-02-31' }).status, 400);
    R.eq('B · fin con otro formato -> 400', crear({ fechaFin: '12/10/2026' }).status, 400);
    const pIgual = crear({ fechaFin: '2026-10-10' });
    R.eq('B · fin igual al inicio se guarda como un día', planDe(pIgual.planId).fechaFin, null);

    R.eq('B · update: fin nuevo -> 200', upd({ planId: pUnDia.planId, fechaFin: '2026-10-11' }).status, 200);
    R.eq('B · update: fin guardado', planDe(pUnDia.planId).fechaFin, '2026-10-11');
    R.eq('B · update: mover solo el inicio después del fin -> 400',
         upd({ planId: pUnDia.planId, fechaProgramada: '2026-10-12' }).status, 400);
    R.eq('B · el update rechazado no tocó el inicio', planDe(pUnDia.planId).fechaProgramada, '2026-10-10');
    upd({ planId: pUnDia.planId, titulo: 'Cena larga' });
    R.eq('B · update sin fechaFin no la toca', planDe(pUnDia.planId).fechaFin, '2026-10-11');
    upd({ planId: pUnDia.planId, fechaFin: '' });
    R.eq('B · update con fin vacío -> vuelve a un día', planDe(pUnDia.planId).fechaFin, null);

    // A — fecha de cada foto (criterios 1, 2, 4, 5 y 9). Una sola subida con
    // varias fotos, como hace el front.
    const s = subir(pViaje.planId, [
      { fechaContenido: '2026-10-10', fechaOrigen: 'captura' },  // 0: sábado
      { fechaContenido: '2026-10-11', fechaOrigen: 'manual' },   // 1: corregida antes de subir
      {},                                                        // 2: sin fecha
      { fechaContenido: '2026-10-14', fechaOrigen: 'captura' },  // 3: futura
      { fechaContenido: '2026-02-31', fechaOrigen: 'captura' },  // 4: día inexistente
      { fechaContenido: '10/10/2026' },                          // 5: otro formato
      { fechaContenido: '1985-01-01', fechaOrigen: 'captura' },  // 6: demasiado vieja
      { fechaContenido: '2026-10-12', fechaOrigen: 'hackeado', gps: '-37.3,-59.1' }, // 7: origen raro y dato extra
    ]);
    R.eq('A · uploadPlanPhotos -> 200', s.status, 200);
    R.eq('A · las 8 se subieron', (s.subidas || []).length, 8);
    if ((s.subidas || []).length === 8) {
      const ids = s.subidas.map(x => x.archivoId);
      R.eq('C1 · foto del sábado subida el martes -> 2026-10-10|captura', fechaDe(ids[0]) + '|' + origenDe(ids[0]), '2026-10-10|captura');
      R.eq('C3 · corregida antes de subir -> 2026-10-11|manual', fechaDe(ids[1]) + '|' + origenDe(ids[1]), '2026-10-11|manual');
      R.eq('C2 · sin fecha -> día de subida en hora Argentina', fechaDe(ids[2]) + '|' + origenDe(ids[2]), '2026-10-13|subida');
      R.eq('C4 · futura -> día de subida', fechaDe(ids[3]) + '|' + origenDe(ids[3]), '2026-10-13|subida');
      R.eq('C4 · 31/02 -> día de subida', fechaDe(ids[4]) + '|' + origenDe(ids[4]), '2026-10-13|subida');
      R.eq('C4 · formato DD/MM/AAAA -> día de subida', fechaDe(ids[5]) + '|' + origenDe(ids[5]), '2026-10-13|subida');
      R.eq('C4 · anterior a 1990 -> día de subida', fechaDe(ids[6]) + '|' + origenDe(ids[6]), '2026-10-13|subida');
      R.eq('C4 · origen desconocido con fecha válida -> captura', fechaDe(ids[7]) + '|' + origenDe(ids[7]), '2026-10-12|captura');
      R.check('C5 · el dato extra (GPS) no quedó en la hoja', JSON.stringify(archivo(ids[7])).indexOf('-37.3') === -1);

      const nombres = s.subidas.map(x => DriveApp.getFileById(x.driveFileId).getName());
      R.check('C9 · el nombre lleva la fecha de captura (' + nombres[0] + ')', nombres[0].indexOf('0001-10-10-2026-') === 0);
      R.check('C9 · la corregida antes de subir, su fecha (' + nombres[1] + ')', nombres[1].indexOf('0002-11-10-2026-') === 0);
      R.check('C9 · la sin fecha, el día de subida (' + nombres[2] + ')', nombres[2].indexOf('0003-13-10-2026-') === 0);
      const padres = s.subidas.map(x => DriveApp.getFileById(x.driveFileId).getParents().next().getId());
      R.check('C9 · las 8 en la misma carpeta de la tarea', padres.every(p => p === padres[0]));

      R.eq('A · getFotosPlan devuelve fechaOrigen',
           fotosDe(pViaje.planId).filter(f => f.archivoId === ids[1])[0].fechaOrigen, 'manual');

      // C3 — corregir a mano después de subir.
      const set = body => parseResp(handleSetFechaFoto(Object.assign({ authUserId: 'usr_fran' }, body)));
      R.eq('C3 · setFechaFoto -> 200', set({ archivoId: ids[2], fecha: '2026-10-12' }).status, 200);
      const corregida = fotosDe(pViaje.planId).filter(f => f.archivoId === ids[2])[0];
      R.eq('C3 · getFotosPlan la ve con la fecha nueva', corregida.fechaContenido, '2026-10-12');
      R.eq('C3 · y con origen manual', corregida.fechaOrigen, 'manual');
      R.eq('C3 · modificado_por = quien corrigió', archivo(ids[2])[col('Archivos', 'modificado_por')], 'usr_fran');
      const recientes = parseResp(handleGetRecentPlanPhotos({ limit: 20 })).fotos;
      R.eq('C3 · el carrusel también la ve corregida', recientes.filter(f => f.archivoId === ids[2])[0].fecha, '2026-10-12');
      R.check('C3 · el nombre del archivo en Drive no cambia',
              DriveApp.getFileById(s.subidas[2].driveFileId).getName().indexOf('0003-13-10-2026-') === 0);
      const aud = filasDe('Auditoria').filter(r => r[col('Auditoria', 'accion')] === 'foto.fecha');
      R.eq('C3 · queda en Auditoria', aud.length, 1);
      R.check('C3 · con valor anterior y nuevo', aud.length === 1 &&
              String(aud[0][col('Auditoria', 'detalle')]).indexOf('2026-10-13') !== -1 &&
              String(aud[0][col('Auditoria', 'detalle')]).indexOf('2026-10-12') !== -1);

      R.eq('C4 · setFechaFoto futura -> 400', set({ archivoId: ids[2], fecha: '2026-10-14' }).status, 400);
      R.eq('C4 · setFechaFoto 31/02 -> 400', set({ archivoId: ids[2], fecha: '2026-02-31' }).status, 400);
      R.eq('C4 · setFechaFoto sin fecha -> 400', set({ archivoId: ids[2] }).status, 400);
      R.eq('C4 · las rechazadas no cambiaron nada', fechaDe(ids[2]), '2026-10-12');
      R.eq('S · setFechaFoto sin archivoId -> 400', set({ fecha: '2026-10-11' }).status, 400);
      R.eq('S · setFechaFoto foto inexistente -> 404', set({ archivoId: 'arc_no_existe', fecha: '2026-10-11' }).status, 404);
      const avatar = insertArchivo({ ownerTipo: 'usuario', ownerId: 'usr_fran', proposito: 'avatar',
                                     driveFileId: 'fake-avatar-media005', mimeType: 'image/png', tamanoBytes: 1,
                                     subidoPor: 'usr_fran', estado: 'activo' });
      R.eq('S · setFechaFoto sobre un avatar -> 404', set({ archivoId: avatar, fecha: '2026-10-11' }).status, 404);

      // Por doPost, como el front.
      const t = crearSesion('usr_noe');
      sesionesCreadas.push(t.split('.')[0]);
      const pedir = payload => parseResp(doPost({ postData: { contents: JSON.stringify(payload) } }));
      R.eq('S · setFechaFoto sin sesión -> 401', pedir({ action: 'setFechaFoto', archivoId: ids[0], fecha: '2026-10-11' }).status, 401);
      R.eq('S · la de sin sesión no cambió nada', fechaDe(ids[0]), '2026-10-10');
      const conSesion = pedir({ action: 'setFechaFoto', archivoId: ids[0], fecha: '2026-10-11', sessionToken: t, authUserId: 'usr_fran' });
      R.eq('S · setFechaFoto con sesión -> 200', conSesion.status, 200);
      R.eq('S · modificado_por sale de la sesión, no del body', archivo(ids[0])[col('Archivos', 'modificado_por')], 'usr_noe');

      // Foto de una tarea eliminada.
      parseResp(handleDeletePlan({ planId: pViaje.planId, authUserId: 'usr_fran' }));
      R.eq('S · setFechaFoto de una tarea eliminada -> 404', set({ archivoId: ids[0], fecha: '2026-10-10' }).status, 404);
    } else {
      R.fail('A · no se subieron las 8 fotos: ' + JSON.stringify(s));
    }

    // C11 — carpeta con el día de inicio, aunque la primera foto se suba después.
    RELOJ_OVERRIDE = '2026-10-03T15:00:00Z';
    const pFinDeMes = crear({ titulo: 'Viaje de fin de mes', fechaProgramada: '2026-09-30', fechaFin: '2026-10-02' });
    const s2 = subir(pFinDeMes.planId, [{ fechaContenido: '2026-10-01', fechaOrigen: 'captura' }]);
    R.eq('C11 · subida -> 200', s2.status, 200);
    const carpetaId = filaPorId('Planes', pFinDeMes.planId)[col('Planes', 'carpeta_fotos_drive_id')];
    if (carpetaId) {
      const carpeta = DriveApp.getFolderById(carpetaId);
      R.check('C11 · la carpeta se llama 30-09-2026-… (' + carpeta.getName() + ')', carpeta.getName().indexOf('30-09-2026-') === 0);
      R.eq('C11 · y cuelga de Septiembre', carpeta.getParents().next().getName(), 'Septiembre');

      // C12 — editar el inicio no la renombra ni la mueve.
      R.eq('C12 · update del inicio -> 200', upd({ planId: pFinDeMes.planId, fechaProgramada: '2026-09-29' }).status, 200);
      R.eq('C12 · la tarea sigue apuntando a la misma carpeta',
           filaPorId('Planes', pFinDeMes.planId)[col('Planes', 'carpeta_fotos_drive_id')], carpetaId);
      R.check('C12 · la carpeta no se renombró', DriveApp.getFolderById(carpetaId).getName().indexOf('30-09-2026-') === 0);
      const s3 = subir(pFinDeMes.planId, [{ fechaContenido: '2026-10-02', fechaOrigen: 'captura' }]);
      R.check('C12 · la foto siguiente cae en la misma carpeta',
              s3.status === 200 && DriveApp.getFileById(s3.subidas[0].driveFileId).getParents().next().getId() === carpetaId);
    } else {
      R.fail('C11 · no se guardó la carpeta de la tarea');
    }

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    RELOJ_OVERRIDE = relojAnterior;
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    driveFileIdsCreados.forEach(fileId => {
      try { DriveApp.getFileById(fileId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar de Drive el archivo de prueba ' + fileId + ' — borralo a mano: ' + e); }
    });
    driveFolderIdsCreados.forEach(folderId => {
      try { DriveApp.getFolderById(folderId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar de Drive la carpeta de prueba ' + folderId + ' — borrala a mano: ' + e); }
    });
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e); }
    }
  }

  return R.finalizar();
}


// ============================================================
// probarMEDIA003() — REQ-MEDIA-003: recuerdos en tres grupos (en este día,
// nuevas, de otro momento). Parte 1: armarRecuerdos() pura, con "hoy" a
// elección para los bordes (31, 29/02, cambio de día). Parte 2: getRecuerdos
// de punta a punta por doPost, con planilla scratch y RELOJ_OVERRIDE.
// Uso: clasp run probarMEDIA003 -P .clasp-test.json -u duck
// ============================================================

function probarMEDIA003() {
  const R = nuevoReporte('REQ-MEDIA-003');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const relojAnterior = RELOJ_OVERRIDE;
  const sesionesCreadas = [];
  let scratchId = null;

  try {
    // ---------- Parte 1: armarRecuerdos() ----------
    const f = (id, planId, fecha, subida) => ({ archivoId: id, planId: planId, fecha: fecha, fechaSubida: subida || '2025-01-01T15:00:00.000Z' });
    const grupo = (grupos, tipo) => (grupos.filter(g => g.tipo === tipo)[0] || { fotos: [] }).fotos.map(x => x.archivoId);
    const HOY = '2026-10-13';

    // C1 — subida hoy con captura de hace un año: en este día, no nuevas.
    let g = armarRecuerdos([f('a1', 'p1', '2025-10-13', '2026-10-13T15:00:00.000Z')], HOY);
    R.eq('C1 · captura de hace un año subida hoy -> en este día', JSON.stringify(grupo(g, 'en_este_dia')), '["a1"]');
    R.eq('C1 · y no en nuevas', grupo(g, 'nuevas').length, 0);

    // C2 — ventana de nuevas: 7 días contando hoy, en hora Argentina.
    g = armarRecuerdos([
      f('n0', 'p1', '2026-10-13', '2026-10-13T15:00:00.000Z'),
      f('n6', 'p1', '2026-10-07', '2026-10-07T15:00:00.000Z'),  // hace 6 días
      f('n7', 'p1', '2026-10-06', '2026-10-06T15:00:00.000Z'),  // hace 7 días
      f('nTz', 'p1', '2026-10-06', '2026-10-07T02:00:00.000Z'), // 06/10 23:00 en Argentina
      f('n10', 'p1', '2026-10-03', '2026-10-03T15:00:00.000Z'), // hace 10 días
    ], HOY);
    R.eq('C2 · nuevas = hoy y hace 6 días, la foto más nueva primero', JSON.stringify(grupo(g, 'nuevas')), '["n0","n6"]');
    R.check('C2 · subida 06/10 23:00 hora Argentina (07/10 en UTC) no es nueva', grupo(g, 'nuevas').indexOf('nTz') === -1);
    R.check('C2 · subida hace 10 días no es nueva', grupo(g, 'nuevas').indexOf('n10') === -1);

    // C3 — años antes que meses.
    g = armarRecuerdos([f('y1', 'p1', '2025-10-13'), f('y2', 'p2', '2024-10-13'), f('m1', 'p3', '2026-09-13')], HOY);
    R.eq('C3 · con fotos de años anteriores, esas (la más reciente primero)', JSON.stringify(grupo(g, 'en_este_dia')), '["y1","y2"]');
    g = armarRecuerdos([f('m1', 'p3', '2026-09-13'), f('m2', 'p4', '2026-08-13'), f('x', 'p5', '2026-09-12')], HOY);
    R.eq('C3 · sin años anteriores, mismo día de meses anteriores', JSON.stringify(grupo(g, 'en_este_dia')), '["m1","m2"]');
    g = armarRecuerdos([f('hoy', 'p1', '2026-10-13')], HOY);
    R.eq('C3 · una foto de hoy no es "en este día"', grupo(g, 'en_este_dia').length, 0);

    // C4 — bordes de calendario.
    g = armarRecuerdos([f('s30', 'p1', '2026-09-30'), f('a31', 'p2', '2026-08-31')], '2026-10-31');
    R.eq('C4 · el 31, solo meses con 31', JSON.stringify(grupo(g, 'en_este_dia')), '["a31"]');
    g = armarRecuerdos([f('f28', 'p1', '2027-02-28'), f('f29', 'p2', '2024-02-29')], '2028-02-29');
    R.eq('C4 · el 29/02 coincide con el 29/02 de otro año', JSON.stringify(grupo(g, 'en_este_dia')), '["f29"]');
    g = armarRecuerdos([f('f29', 'p2', '2024-02-29')], '2027-03-01');
    R.eq('C4 · un 29/02 no aparece el 01/03', grupo(g, 'en_este_dia').length, 0);

    // C5 — de otro momento.
    const viejas = [
      f('v1', 'pA', '2026-09-01'), f('v2', 'pA', '2026-08-30'),
      f('v3', 'pB', '2026-09-05'),
      f('v4', 'pC', '2026-09-20'),
      f('v5', 'pD', '2026-09-28'), // hace 15 días: entra
      f('v6', 'pE', '2026-09-29'), // hace 14 días: no entra
      f('v7', 'pF', '2025-10-13'), // es "en este día"
      f('v8', 'pF', '2025-10-14'), // misma tarea que la de en este día
    ];
    const g1 = armarRecuerdos(viejas, HOY);
    R.eq('C5 · dos pedidos del mismo día -> la misma tarea',
         JSON.stringify(grupo(g1, 'de_otro_momento')), JSON.stringify(grupo(armarRecuerdos(viejas, HOY), 'de_otro_momento')));
    const otroHoy = g1.filter(x => x.tipo === 'de_otro_momento')[0];
    const planesOtro = otroHoy ? otroHoy.fotos.map(x => x.planId) : [];
    R.check('C5 · es una sola tarea', planesOtro.length > 0 && planesOtro.every(p => p === planesOtro[0]));
    R.check('C5 · de las que tienen fotos de hace más de 14 días (pA, pB, pC, pD) — salió ' + planesOtro[0],
            ['pA', 'pB', 'pC', 'pD'].indexOf(planesOtro[0]) !== -1);
    const elegidas = {};
    let nuncaRepite = true;
    for (let d = 0; d < 20; d++) {
      const gd = armarRecuerdos(viejas, sumarDiasFecha(HOY, d));
      const go = gd.filter(x => x.tipo === 'de_otro_momento')[0];
      const pe = {};
      (gd.filter(x => x.tipo === 'en_este_dia')[0] || { fotos: [] }).fotos.forEach(x => { pe[x.planId] = true; });
      if (go) {
        elegidas[go.fotos[0].planId] = true;
        if (pe[go.fotos[0].planId]) nuncaRepite = false;
      }
    }
    R.check('C5 · en 20 días cambia de tarea (' + Object.keys(elegidas).join(',') + ')', Object.keys(elegidas).length > 1);
    R.check('C5 · nunca repite la tarea de en este día', nuncaRepite);
    const gA = armarRecuerdos([f('v1', 'pA', '2026-09-01'), f('v2', 'pA', '2026-08-30'), f('v9', 'pA', '2026-10-10')], HOY);
    R.eq('C5 · trae las fotos de la tarea, la más vieja primero', JSON.stringify(grupo(gA, 'de_otro_momento')), '["v2","v1","v9"]');

    // C6 — ninguna foto en dos grupos, y tope de 20.
    let dup = false;
    for (let d = 0; d < 40; d++) {
      const dia = sumarDiasFecha(HOY, d);
      const vistos = {};
      armarRecuerdos(viejas.concat([f('nn', 'pA', '2026-09-01', dia + 'T15:00:00.000Z')]), dia)
        .forEach(x => x.fotos.forEach(y => { if (vistos[y.archivoId]) dup = true; vistos[y.archivoId] = true; }));
    }
    R.check('C6 · ninguna foto en dos grupos (40 días distintos)', !dup);
    const muchas = [];
    for (let i = 0; i < 25; i++) muchas.push(f('mm' + i, 'pX', '2026-10-1' + (i % 3), '2026-10-12T15:00:00.000Z'));
    R.eq('C6 · tope de 20 por grupo', grupo(armarRecuerdos(muchas, HOY), 'nuevas').length, 20);
    R.eq('C6 · sin fotos -> sin grupos', armarRecuerdos([], HOY).length, 0);

    // ---------- Parte 2: getRecuerdos por doPost ----------
    const ss = SpreadsheetApp.create('SCRATCH probarMEDIA003 ' + new Date().toISOString());
    scratchId = ss.getId();
    ss.setSpreadsheetTimeZone(TZ_APP);
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);
    sembrarEstadoMedia002(ss);
    invalidarCacheHoja(SHEETS.USUARIOS);
    RELOJ_OVERRIDE = '2026-10-13T15:00:00Z'; // mar 13/10, 12:00 hora Argentina

    const crear = titulo => parseResp(handleCreatePlan({
      titulo: titulo, categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-09-01',
    })).planId;
    // insertArchivo pone fecha_subida = ahora; acá se pisa con la que pide el caso.
    const foto = (planId, fecha, subida, estado) => {
      const id = insertArchivo({
        ownerTipo: 'plan', ownerId: planId, proposito: 'adjunto', fechaContenido: fecha, fechaOrigen: 'captura',
        driveFileId: 'fake-drive-media003-' + planId, mimeType: 'image/jpeg', tamanoBytes: 1,
        subidoPor: 'usr_noe', estado: estado || 'activo',
      });
      const sh = getSheet(SHEETS.ARCHIVOS);
      const data = sh.getDataRange().getValues();
      const c = data[0].indexOf('fecha_subida');
      for (let i = 1; i < data.length; i++) if (data[i][0] === id) sh.getRange(i + 1, c + 1).setValue(subida);
      return id;
    };

    const pAnio   = crear('Aniversario');
    const pNueva  = crear('Cena de ayer');
    const pVieja  = crear('Feria de agosto');
    const pBorrar = crear('Tarea borrada');
    const aAnio   = foto(pAnio, '2025-10-13', '2026-10-13T14:00:00.000Z');
    const aNueva  = foto(pNueva, '2026-10-12', '2026-10-12T23:00:00.000Z');
    const aVieja  = foto(pVieja, '2026-08-20', '2026-08-21T15:00:00.000Z');
    const aElim   = foto(pNueva, '2026-10-12', '2026-10-12T23:00:00.000Z', 'eliminado');
    const aBorr1  = foto(pBorrar, '2025-10-13', '2026-10-13T14:00:00.000Z');
    const aBorr2  = foto(pBorrar, '2026-10-12', '2026-10-12T23:00:00.000Z');
    const aBorr3  = foto(pBorrar, '2026-08-01', '2026-08-01T15:00:00.000Z');
    parseResp(handleDeletePlan({ planId: pBorrar, authUserId: 'usr_fran' }));
    SpreadsheetApp.flush();

    const t = crearSesion('usr_noe');
    sesionesCreadas.push(t.split('.')[0]);
    const pedir = payload => parseResp(doPost({ postData: { contents: JSON.stringify(payload) } }));

    R.eq('C8 · getRecuerdos sin sesión -> 401', pedir({ action: 'getRecuerdos' }).status, 401);
    R.eq('C8 · getRecuerdos con token falso -> 401', pedir({ action: 'getRecuerdos', sessionToken: 'ses_x.yyyy' }).status, 401);
    const r = pedir({ action: 'getRecuerdos', sessionToken: t });
    R.eq('E2E · con sesión -> 200', r.status, 200);
    R.eq('E2E · hoy en hora Argentina', r.hoy, '2026-10-13');
    R.eq('E2E · grupos en orden de prioridad', JSON.stringify((r.grupos || []).map(x => x.tipo)),
         '["en_este_dia","nuevas","de_otro_momento"]');
    const ids = tipo => ((r.grupos || []).filter(x => x.tipo === tipo)[0] || { fotos: [] }).fotos.map(x => x.archivoId);
    R.eq('E2E · en este día = la del aniversario', JSON.stringify(ids('en_este_dia')), JSON.stringify([aAnio]));
    R.eq('E2E · nuevas = la de ayer', JSON.stringify(ids('nuevas')), JSON.stringify([aNueva]));
    R.eq('E2E · de otro momento = la feria', JSON.stringify(ids('de_otro_momento')), JSON.stringify([aVieja]));
    const todas = [].concat(ids('en_este_dia'), ids('nuevas'), ids('de_otro_momento'));
    R.check('C7 · ninguna foto de la tarea eliminada (BL-017)', [aBorr1, aBorr2, aBorr3].every(x => todas.indexOf(x) === -1));
    R.check('C7 · ni la foto con estado eliminado', todas.indexOf(aElim) === -1);
    const fAnio = (r.grupos || [])[0] && r.grupos[0].fotos[0];
    R.check('E2E · cada foto trae título, categoría, tarea y fecha',
            !!fAnio && fAnio.tituloPlan === 'Aniversario' && fAnio.categoriaNombre === 'Mantenimiento' &&
            fAnio.fecha === '2025-10-13' && fAnio.planId === pAnio);
    const texto = JSON.stringify(r);
    R.check('S · no expone el ID de Drive', texto.indexOf('fake-drive') === -1 && texto.toLowerCase().indexOf('drive') === -1);

    // Cambio de día: 9 días después, la de ayer ya no es nueva.
    RELOJ_OVERRIDE = '2026-10-21T15:00:00Z';
    const r2 = pedir({ action: 'getRecuerdos', sessionToken: t });
    R.check('E2E · 9 días después la de ayer ya no es nueva',
            r2.status === 200 && (r2.grupos || []).every(x => x.tipo !== 'nuevas'));

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    RELOJ_OVERRIDE = relojAnterior;
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e); }
    }
  }

  return R.finalizar();
}


// ============================================================
// probarPERF004() — REQ-PERF-004: getMiniaturas devuelve la miniatura que
// genera Drive (unos KB), no la foto entera, sin exponer URLs de Google.
// Sube a Drive una imagen de verdad (un gráfico de 1200x900 armado con
// Charts; con un PNG de 1 px la miniatura no dice nada) y la borra al final.
// Los logs (criterio 4, que no salga el thumbnailLink) se miran aparte con
// `clasp logs --json`.
// Uso: clasp run probarPERF004 -P .clasp-test.json -u duck
// ============================================================

function probarPERF004() {
  const R = nuevoReporte('REQ-PERF-004');
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const sesionesCreadas = [];
  const driveFileIdsCreados = [];
  const driveFolderIdsCreados = [];
  let scratchId = null;

  try {
    const ss = SpreadsheetApp.create('SCRATCH probarPERF004 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    R.nota('planilla scratch: ' + scratchId);
    sembrarEstadoMedia002(ss);
    invalidarCacheHoja(SHEETS.USUARIOS);

    // Imagen realista: un gráfico con relleno, 1200x900.
    const dt = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, 'x').addColumn(Charts.ColumnType.NUMBER, 'y');
    for (let i = 0; i < 24; i++) dt.addRow(['p' + i, Math.round(50 + 40 * Math.sin(i))]);
    // En JPEG, como lo que sube la app después de comprimir.
    const png = Charts.newAreaChart().setDataTable(dt.build()).setDimensions(1200, 900).build().getAs('image/jpeg');
    const pngBytes = png.getBytes().length;
    R.nota('imagen de prueba: ' + pngBytes + ' bytes');

    const planId = parseResp(handleCreatePlan({
      titulo: 'Miniaturas', categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-01',
    })).planId;
    const s = parseResp(handleUploadPlanPhotos({
      planId: planId,
      files: [{ fileBase64: Utilities.base64Encode(png.getBytes()), mimeType: 'image/jpeg' }],
      authUserId: 'usr_fran',
    }));
    (s.subidas || []).forEach(x => driveFileIdsCreados.push(x.driveFileId));
    const carpetaId = filaPorId('Planes', planId)[col('Planes', 'carpeta_fotos_drive_id')];
    if (carpetaId) driveFolderIdsCreados.push(carpetaId);
    R.eq('Setup · la foto real se subió', (s.subidas || []).length, 1);
    const real = (s.subidas || [])[0] ? s.subidas[0].archivoId : 'arc_sin_subida';

    const fakeDrive = 'fake-drive-perf004-no-existe';
    const falsa = insertArchivo({ ownerTipo: 'plan', ownerId: planId, proposito: 'adjunto',
      driveFileId: fakeDrive, mimeType: 'image/jpeg', tamanoBytes: 1, subidoPor: 'usr_fran', estado: 'activo' });
    const archivada = insertArchivo({ ownerTipo: 'plan', ownerId: planId, proposito: 'adjunto',
      driveFileId: driveFileIdsCreados[0] || fakeDrive, mimeType: 'image/png', tamanoBytes: 1,
      subidoPor: 'usr_fran', estado: 'archivado' });

    const mini = body => parseResp(handleGetMiniaturas(body));

    // Validación de entrada.
    R.eq('E · sin archivoIds -> 400', mini({}).status, 400);
    R.eq('E · lista vacía -> 400', mini({ archivoIds: [] }).status, 400);
    R.eq('E · no es lista -> 400', mini({ archivoIds: real }).status, 400);
    R.eq('E · solo valores que no son texto -> 400', mini({ archivoIds: [1, null, {}] }).status, 400);

    const r = mini({ archivoIds: [real, falsa, archivada, 'arc_no_existe', real] });
    R.eq('C1 · pedido mixto -> 200', r.status, 200);
    const porId = {};
    (r.archivos || []).forEach(a => { porId[a.archivoId] = a; });
    R.eq('C1 · los ids repetidos vuelven una sola vez', (r.archivos || []).length, 4);
    R.eq('C1 · respeta el orden pedido', JSON.stringify((r.archivos || []).map(a => a.archivoId)),
         JSON.stringify([real, falsa, archivada, 'arc_no_existe']));

    const m = porId[real] || {};
    R.check('C1 · la foto real trae miniatura (base64)', !!m.base64 && !m.sinMiniatura);
    R.check('C1 · con mimeType de imagen', /^image\//.test(m.mimeType || ''));
    const miniBytes = m.base64 ? Utilities.base64Decode(m.base64).length : -1;
    R.nota('miniatura: ' + miniBytes + ' bytes (original ' + pngBytes + ')');
    R.check('C1 · la miniatura pesa menos de 30 KB', miniBytes > 0 && miniBytes < 30 * 1024);
    // Un gráfico de colores planos pesa poco aun entero: acá solo se exige que
    // sea más chica. La proporción real (fotos de 150 KB a 1 MB) se mide en
    // el navegador (criterio 1).
    R.check('C1 · y más chica que la original', miniBytes > 0 && miniBytes < pngBytes);

    R.check('C2 · archivo activo que no está en Drive -> sinMiniatura',
            !!porId[falsa] && porId[falsa].sinMiniatura === true && !porId[falsa].base64);
    R.eq('C2 · archivada -> no encontrado', (porId[archivada] || {}).error, 'Archivo no encontrado.');
    R.eq('C2 · inexistente -> no encontrado', (porId['arc_no_existe'] || {}).error, 'Archivo no encontrado.');

    const texto = JSON.stringify(r);
    R.check('C4 · la respuesta no trae URLs', !/https?:|googleusercontent|googleapis/i.test(texto));
    R.check('C4 · ni IDs de Drive', texto.indexOf(fakeDrive) === -1 &&
            driveFileIdsCreados.every(id => texto.indexOf(id) === -1));

    // Tope por pedido.
    const muchos = [];
    for (let i = 0; i < 40; i++) muchos.push('arc_tope_' + i);
    R.eq('E · más de 30 ids -> responde 30', (mini({ archivoIds: muchos }).archivos || []).length, 30);

    // C5 — por doPost: sin sesión 401, con sesión 200.
    const t = crearSesion('usr_noe');
    sesionesCreadas.push(t.split('.')[0]);
    const pedir = payload => parseResp(doPost({ postData: { contents: JSON.stringify(payload) } }));
    R.eq('C5 · getMiniaturas sin sesión -> 401', pedir({ action: 'getMiniaturas', archivoIds: [real] }).status, 401);
    R.eq('C5 · getMiniaturas con token falso -> 401',
         pedir({ action: 'getMiniaturas', archivoIds: [real], sessionToken: 'ses_x.yyyy' }).status, 401);
    const conSesion = pedir({ action: 'getMiniaturas', archivoIds: [real], sessionToken: t });
    R.eq('C5 · getMiniaturas con sesión -> 200', conSesion.status, 200);
    R.check('C5 · con sesión trae la miniatura', !!((conSesion.archivos || [])[0] || {}).base64);

  } catch (err) {
    R.fail('EXCEPCION no controlada en el runner: ' + (err && err.stack ? err.stack : err));
  } finally {
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    driveFileIdsCreados.forEach(fileId => {
      try { DriveApp.getFileById(fileId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar de Drive el archivo de prueba ' + fileId + ' — borralo a mano: ' + e); }
    });
    driveFolderIdsCreados.forEach(folderId => {
      try { DriveApp.getFolderById(folderId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar de Drive la carpeta de prueba ' + folderId + ' — borrala a mano: ' + e); }
    });
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { R.nota('no se pudo borrar la planilla scratch ' + scratchId + ' — borrala a mano: ' + e); }
    }
  }

  return R.finalizar();
}


// ============================================================
// medirBL032() — BL-032: dónde se van los ~4 s de getFotosPlan. No es una
// prueba (no afirma nada): mide cada etapa del pedido dentro del servidor
// contra una planilla scratch con tamaños holgados (400 filas en Archivos,
// 80 en Planes, 150 en Sesiones) y una tarea con 16 fotos. Lo que tarda el
// viaje al Web App, sin lógica, se mide aparte desde afuera.
// Uso: clasp run medirBL032 -P .clasp-test.json -u duck
// ============================================================
function medirBL032() {
  const overrideAnterior = TEST_SPREADSHEET_ID_OVERRIDE;
  const sesionesCreadas = [];
  let scratchId = null;
  const res = { tiempos: [] };
  const medir = (etiqueta, fn) => {
    const t0 = Date.now();
    const v = fn();
    res.tiempos.push(etiqueta + ': ' + (Date.now() - t0) + ' ms');
    return v;
  };
  // Clona la última fila de una hoja n veces, cambiando las columnas de `cambios`.
  const rellenar = (nombre, n, cambios) => {
    const sh = getSheet(nombre);
    const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const base = sh.getRange(sh.getLastRow(), 1, 1, h.length).getValues()[0];
    const filas = [];
    for (let i = 0; i < n; i++) {
      const f = base.slice();
      Object.keys(cambios).forEach(c => { f[h.indexOf(c)] = cambios[c](i); });
      filas.push(f);
    }
    sh.getRange(sh.getLastRow() + 1, 1, n, h.length).setValues(filas);
  };

  try {
    const ss = SpreadsheetApp.create('SCRATCH medirBL032 ' + new Date().toISOString());
    scratchId = ss.getId();
    TEST_SPREADSHEET_ID_OVERRIDE = scratchId;
    sembrarEstadoMedia002(ss);
    invalidarCacheHoja(SHEETS.USUARIOS);

    const planId = parseResp(handleCreatePlan({
      titulo: 'Dieciséis fotos', categoriaId: 'cat_mant', userId: 'usr_fran', fechaProgramada: '2026-10-01',
    })).planId;
    rellenar(SHEETS.PLANES, 79, { plan_id: i => 'plan_relleno_' + i });
    for (let i = 0; i < 16; i++) {
      insertArchivo({ ownerTipo: 'plan', ownerId: planId, proposito: 'adjunto',
        driveFileId: 'fake-drive-bl032-' + i, mimeType: 'image/jpeg', tamanoBytes: 1,
        subidoPor: 'usr_fran', estado: 'activo' });
    }
    rellenar(SHEETS.ARCHIVOS, 384, { archivo_id: i => 'arc_relleno_' + i, owner_id: i => 'plan_relleno_' + (i % 79) });
    const t = crearSesion('usr_noe');
    sesionesCreadas.push(t.split('.')[0]);
    rellenar(SHEETS.SESIONES, 149, { session_id: i => 'ses_relleno_' + i });
    SpreadsheetApp.flush();

    res.filas = {
      Planes: getSheet(SHEETS.PLANES).getLastRow() - 1,
      Archivos: getSheet(SHEETS.ARCHIVOS).getLastRow() - 1,
      Sesiones: getSheet(SHEETS.SESIONES).getLastRow() - 1,
    };

    // Etapas por separado. Dentro de una misma ejecución, la segunda llamada
    // puede salir más barata que en un pedido real (cada pedido del Web App
    // es una ejecución nueva): por eso se mide la primera y la repetida.
    const sid = t.split('.')[0];
    CacheService.getScriptCache().remove('sesion-ok:' + sid);
    invalidarCacheHoja(SHEETS.USUARIOS);
    medir('openById (repetido en la misma ejecución)', () => abrirPlanilla());
    medir('validarSesion, camino lento (lee Sesiones)', () => validarSesion(t));
    medir('validarSesion, camino rápido (caché 90 s)', () => validarSesion(t));
    medir('usuarioHabilitado sin caché (lee Usuarios)', () => usuarioHabilitado('usr_noe'));
    medir('usuarioHabilitado con caché', () => usuarioHabilitado('usr_noe'));
    medir('buscarPlanActivo (lee Planes)', () => buscarPlanActivo(getSheet(SHEETS.PLANES), planId));
    medir('leer Archivos entera', () => getSheet(SHEETS.ARCHIVOS).getDataRange().getValues());
    medir('handleGetFotosPlan', () => handleGetFotosPlan({ planId: planId }));

    // Pedido completo por doPost, como llega del Web App.
    const pedir = () => parseResp(doPost({ postData: { contents: JSON.stringify(
      { action: 'getFotosPlan', planId: planId, sessionToken: t }) } }));
    CacheService.getScriptCache().remove('sesion-ok:' + sid);
    invalidarCacheHoja(SHEETS.USUARIOS);
    const r1 = medir('doPost getFotosPlan, sin cachés', pedir);
    medir('doPost getFotosPlan, con cachés', pedir);
    medir('doPost getFotosPlan, con cachés (otra vez)', pedir);
    res.fotosDevueltas = (r1.fotos || []).length;
    res.status = r1.status;
  } catch (err) {
    res.error = String(err && err.stack ? err.stack : err);
  } finally {
    try {
      const claves = [];
      sesionesCreadas.forEach(id => { claves.push('sesion:' + id, 'sesion-ok:' + id, 'revocada-pendiente:' + id); });
      if (scratchId) claves.push('hoja:' + scratchId + ':' + SHEETS.USUARIOS, 'hoja:' + scratchId + ':' + SHEETS.CATEGORIAS);
      if (claves.length) CacheService.getScriptCache().removeAll(claves);
    } catch (e) { /* ignorado */ }
    TEST_SPREADSHEET_ID_OVERRIDE = overrideAnterior;
    if (scratchId) {
      try { DriveApp.getFileById(scratchId).setTrashed(true); }
      catch (e) { res.nota = 'no se pudo borrar la planilla scratch ' + scratchId + ': ' + e; }
    }
  }
  return res;
}

// BL-032: lo que corre al cargar el script en cada pedido (4 getProperty).
// Uso: clasp run medirBL032_arranque -P .clasp-test.json -u duck
function medirBL032_arranque() {
  const out = [];
  for (let n = 0; n < 3; n++) {
    let t0 = Date.now();
    const p = PropertiesService.getScriptProperties();
    ['SPREADSHEET_ID', 'DRIVE_FOLDER_ID', 'OAUTH_CLIENT_ID', 'SESSION_SECRET'].forEach(k => p.getProperty(k));
    const cuatro = Date.now() - t0;
    t0 = Date.now();
    PropertiesService.getScriptProperties().getProperties();
    out.push('4 getProperty: ' + cuatro + ' ms · 1 getProperties: ' + (Date.now() - t0) + ' ms');
  }
  // Las constantes de Code.gs (leídas con getProperties) son las mismas que
  // devolvería getProperty. No se imprime ningún valor.
  const p = PropertiesService.getScriptProperties();
  const iguales = { SPREADSHEET_ID: SPREADSHEET_ID, DRIVE_FOLDER_ID: DRIVE_FOLDER_ID,
                    OAUTH_CLIENT_ID: OAUTH_CLIENT_ID, SESSION_SECRET: SESSION_SECRET };
  Object.keys(iguales).forEach(k => {
    out.push(k + ': ' + (iguales[k] === p.getProperty(k) ? 'igual' : 'DISTINTA') + (iguales[k] ? '' : ' (vacía)'));
  });
  return out;
}
