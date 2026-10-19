/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Alertas.gs (Configuración del sistema y alertas por correo)
 * ============================================================================
 */

var HANDLER_ALERTA = 'enviarAlertaStockBajo';
var DEPRECIACION_RESIDUAL_DEFAULT = 10; // % del valor contable que queda como valor residual

function props_() { return PropertiesService.getScriptProperties(); }

/** Porcentaje de valor residual configurado (para depreciación) */
function residualConfigurado_() {
  var n = parseFloat(props_().getProperty('DEPRECIACION_RESIDUAL'));
  return (isNaN(n) || n < 0 || n > 100) ? DEPRECIACION_RESIDUAL_DEFAULT : n;
}

function existeDisparadorAlerta_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === HANDLER_ALERTA; });
}

/**
 * Configuración vigente (solo administrador)
 */
function obtenerConfiguracion(token) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR']);
    var p = props_();
    var hora = parseInt(p.getProperty('ALERTAS_HORA'), 10);
    return {
      success: true,
      data: {
        alertas: {
          emails: p.getProperty('ALERTAS_EMAIL') || '',
          activo: p.getProperty('ALERTAS_ACTIVAS') === '1' && existeDisparadorAlerta_(),
          hora: isNaN(hora) ? 7 : hora,
          cuotaCorreosRestante: (function () { try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; } })()
        },
        depreciacion: { residual: residualConfigurado_() }
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function guardarConfiguracion_(token, cfg) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR']);
    cfg = cfg || {};
    var p = props_();

    // --- Depreciación ---
    if (cfg.residual !== undefined && cfg.residual !== '') {
      var r = parseFloat(cfg.residual);
      if (isNaN(r) || r < 0 || r > 100) return { success: false, message: 'El valor residual debe estar entre 0 y 100 %.' };
      p.setProperty('DEPRECIACION_RESIDUAL', String(r));
    }

    // --- Alertas ---
    var emails = String(cfg.emails || '').split(/[,;\s]+/).map(function (e) { return e.trim().toLowerCase(); }).filter(Boolean);
    for (var i = 0; i < emails.length; i++) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emails[i])) return { success: false, message: 'Correo inválido: ' + emails[i] };
    }
    var activo = !!cfg.activo;
    if (activo && !emails.length) return { success: false, message: 'Ingrese al menos un correo para activar las alertas.' };
    var hora = parseInt(cfg.hora, 10);
    if (isNaN(hora) || hora < 0 || hora > 23) hora = 7;

    // Reemplazar el disparador
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === HANDLER_ALERTA) ScriptApp.deleteTrigger(t);
    });
    if (activo) {
      ScriptApp.newTrigger(HANDLER_ALERTA).timeBased().everyDays(1).atHour(hora).create();
    }
    p.setProperty('ALERTAS_EMAIL', emails.join(', '));
    p.setProperty('ALERTAS_ACTIVAS', activo ? '1' : '0');
    p.setProperty('ALERTAS_HORA', String(hora));

    registrarAuditoria(usuario.email, 'MODIFICAR', 'CONFIGURACION', 'ALERTAS',
      '', { activo: activo, hora: hora, destinatarios: emails.length, residual: residualConfigurado_() });
    return { success: true, message: 'Configuración guardada.' + (activo ? ' Las alertas se enviarán cada día a las ' + hora + ':00.' : '') };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function guardarConfiguracion() { return ejecutarConBloqueo_(guardarConfiguracion_, arguments); }

function escHtml_(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/**
 * Productos en o bajo su stock mínimo
 */
function productosBajoMinimo_() {
  var sheet = getDB().getSheetByName('EXISTENCIAS');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var items = sheetValuesToObjects(sheet.getDataRange().getValues());
  var lista = [];
  items.forEach(function (x) {
    var cant = parseFloat(x.CANTIDAD) || 0;
    var min = stockMinimoDe_(x);
    if (cant <= min) {
      lista.push({ codigo: x.CODIGO, descripcion: x.DESCRIPCION, cantidad: cant, minimo: min, critico: cant <= Math.floor(min / 3) });
    }
  });
  lista.sort(function (a, b) { return (a.cantidad - a.minimo) - (b.cantidad - b.minimo); });
  return lista;
}

/**
 * Función que ejecuta el disparador diario (no recibe token).
 * Envía un correo solo si hay productos bajo el mínimo.
 */
function enviarAlertaStockBajo() {
  return enviarAlertaInterna_(false);
}

function enviarAlertaInterna_(esPrueba) {
  var destinos = props_().getProperty('ALERTAS_EMAIL') || '';
  if (!destinos) return { success: false, message: 'No hay correos configurados.' };

  var lista = productosBajoMinimo_();
  if (!lista.length && !esPrueba) return { success: true, message: 'Sin productos bajo el mínimo: no se envió correo.', enviados: 0 };

  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { }

  var filas = lista.map(function (p) {
    return '<tr><td style="padding:6px;border:1px solid #e2e8f0;font-family:monospace">' + escHtml_(p.codigo) + '</td>' +
      '<td style="padding:6px;border:1px solid #e2e8f0">' + escHtml_(p.descripcion) + '</td>' +
      '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;color:' + (p.critico ? '#dc2626' : '#d97706') + '">' + p.cantidad + '</td>' +
      '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center">' + p.minimo + '</td>' +
      '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center">' + (p.critico ? 'CRÍTICO' : 'BAJO MÍNIMO') + '</td></tr>';
  }).join('');

  var cuerpo = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">' +
    '<h3 style="color:#1e3a8a">Alerta de stock bajo' + (esPrueba ? ' (mensaje de prueba)' : '') + '</h3>' +
    (lista.length
      ? '<p>' + lista.length + ' producto(s) están en o por debajo de su stock mínimo:</p>' +
        '<table style="border-collapse:collapse;font-size:13px"><thead><tr style="background:#1e3a8a;color:#fff">' +
        '<th style="padding:6px">Código</th><th style="padding:6px">Descripción</th><th style="padding:6px">Stock</th><th style="padding:6px">Mínimo</th><th style="padding:6px">Estado</th></tr></thead><tbody>' + filas + '</tbody></table>'
      : '<p>Por ahora no hay productos bajo el mínimo. Este es solo un mensaje de prueba.</p>') +
    (url ? '<p style="margin-top:16px"><a href="' + escHtml_(url) + '">Abrir el sistema</a></p>' : '') +
    '<p style="color:#64748b;font-size:12px">Mensaje automático del ' + escHtml_(CONFIG.APP_TITLE) + ' · ' + getFechaHoraActual() + '</p></div>';

  MailApp.sendEmail({
    to: destinos,
    subject: (esPrueba ? '[PRUEBA] ' : '') + 'Alerta de stock bajo: ' + lista.length + ' producto(s)',
    htmlBody: cuerpo,
    name: CONFIG.APP_TITLE
  });

  registrarAuditoria('SISTEMA', 'ALERTA', 'EXISTENCIAS', 'STOCK_BAJO', '', { productos: lista.length, prueba: !!esPrueba });
  return { success: true, message: 'Correo enviado a: ' + destinos, enviados: 1 };
}

/**
 * Envía un correo de prueba a los destinatarios configurados (solo administrador)
 */
function enviarAlertaPrueba(token) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR']);
    return enviarAlertaInterna_(true);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Ejecute esta función UNA VEZ desde el editor de Apps Script (o desde el menú de la hoja)
 * para que Google le pida los permisos de Drive y correo.
 */
function autorizarPermisos() {
  DriveApp.getRootFolder();
  MailApp.getRemainingDailyQuota();
  ScriptApp.getProjectTriggers();
  var msg = 'Permisos autorizados correctamente (Drive, correo y disparadores).';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Permisos', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { }
  return { success: true, message: msg };
}
