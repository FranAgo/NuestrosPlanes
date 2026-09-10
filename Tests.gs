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
