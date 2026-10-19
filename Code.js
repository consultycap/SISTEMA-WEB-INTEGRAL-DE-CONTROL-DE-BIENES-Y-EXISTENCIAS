/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Code.gs (Punto de Entrada, Enrutamiento y Utilidades Globales)
 * ============================================================================
 */

var CONFIG = {
  APP_TITLE: 'Sistema de Control de Bienes y Existencias',
  APP_VERSION: '2.7.0',
  INSTITUCION: 'Gestión Institucional de Activos y Existencias',
  // ID del Google Sheet vinculado al sistema:
  SPREADSHEET_ID: '1OdcRpUMr2hdIFYAVHQa9lyQ4XXgGr6JPQxIiavVzDYY',
  // CacheService permite como máximo 6 horas (21600 s)
  SESSION_EXPIRATION_HOURS: 6
};

var _DB_CACHE = null;

/**
 * Obtiene la referencia al Spreadsheet (se reutiliza dentro de la misma ejecución)
 */
function getDB() {
  if (_DB_CACHE) return _DB_CACHE;
  try {
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== '') {
      _DB_CACHE = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
      return _DB_CACHE;
    }
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) {
      throw new Error('No se detectó una hoja de cálculo vinculada. Coloque el ID en CONFIG.SPREADSHEET_ID.');
    }
    _DB_CACHE = active;
    return _DB_CACHE;
  } catch (e) {
    throw new Error('Error de conexión con Google Sheets: ' + e.message);
  }
}

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('index');
    template.appTitle = CONFIG.APP_TITLE;
    template.appVersion = CONFIG.APP_VERSION;
    template.institucion = CONFIG.INSTITUCION;

    return template.evaluate()
      .setTitle(CONFIG.APP_TITLE)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setFaviconUrl('https://img.icons8.com/fluency/48/inventory-flow.png');
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:30px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;max-width:600px;margin:40px auto;">' +
      '<h2>Error al iniciar la aplicación</h2>' +
      '<p>' + String(err.message).replace(/</g, '&lt;') + '</p>' +
      '<p style="color:#475569;font-size:13px;">Verifique que el archivo <b>index</b> exista en su proyecto.</p>' +
      '</div>'
    );
  }
}

function doPost(e) {
  return doGet(e);
}

/**
 * Incluye archivos modulares HTML/CSS/JS. Prueba con y sin extensión.
 */
function include(filename) {
  if (!filename) return '';
  var base = String(filename).trim().replace(/\.html$/i, '');
  var intentos = [base, base + '.html'];

  for (var i = 0; i < intentos.length; i++) {
    try {
      return HtmlService.createHtmlOutputFromFile(intentos[i]).getContent();
    } catch (e) { /* probar siguiente */ }
  }

  var errMsg = 'ARCHIVO NO ENCONTRADO: include("' + filename + '")';
  Logger.log('[include] ' + errMsg);
  return '<script>console.error(' + JSON.stringify(errMsg) + ');<\/script>';
}

/**
 * Validador de sesión y permisos de rol
 */
function validarSesionYRol(token, rolesPermitidos) {
  if (!token) {
    throw new Error('Sesión no válida o expirada. Por favor inicie sesión nuevamente.');
  }
  var usuario = verificarTokenSesion(token);
  if (!usuario) {
    throw new Error('Sesión inválida o expirada.');
  }
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    if (rolesPermitidos.indexOf(usuario.rol) === -1) {
      throw new Error('Acceso no autorizado: Su rol (' + usuario.rol + ') no tiene permisos para esta acción.');
    }
  }
  return usuario;
}

function sheetValuesToObjects(values) {
  if (!values || values.length <= 1) return [];
  var headers = values[0];
  var rows = values.slice(1);
  var tz = Session.getScriptTimeZone() || 'GMT-5';

  return rows.map(function (row, rowIndex) {
    var item = { _rowIndex: rowIndex + 2 };
    headers.forEach(function (header, colIndex) {
      var key = String(header).trim();
      var val = row[colIndex];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, tz, 'yyyy-MM-dd HH:mm:ss');
      }
      item[key] = (val !== undefined && val !== null) ? val : '';
    });
    return item;
  });
}

function getFechaHoraActual() {
  var tz = Session.getScriptTimeZone() || 'GMT-5';
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
}

function generarIdUnico(prefijo) {
  var timestamp = Utilities.formatDate(new Date(), 'GMT-5', 'yyyyMMdd-HHmmss');
  var random = Math.floor(Math.random() * 900 + 100);
  return (prefijo ? prefijo + '-' : '') + timestamp + '-' + random;
}

/* ============================================================================
 * UTILIDADES NUEVAS
 * ============================================================================ */

/**
 * Ejecuta una función con bloqueo global para evitar condiciones de carrera
 * (dos usuarios registrando movimientos o generando códigos a la vez).
 */
function conBloqueo(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Wrapper para funciones de escritura públicas:
 * function crearBien() { return ejecutarConBloqueo_(crearBien_, arguments); }
 */
function ejecutarConBloqueo_(fn, args) {
  try {
    return conBloqueo(function () { return fn.apply(null, args); });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mayor correlativo numérico de una columna con formato PREFIJO-00001 (o PREFIJO-0001).
 */
function maxCorrelativo_(sheet, columna, prefijo) {
  if (!sheet || sheet.getLastRow() <= 1) return 0;
  var valores = sheet.getRange(2, columna, sheet.getLastRow() - 1, 1).getValues();
  var pref = String(prefijo).toUpperCase() + '-';
  var max = 0;
  for (var i = 0; i < valores.length; i++) {
    var v = String(valores[i][0]).toUpperCase().trim();
    if (v.indexOf(pref) === 0) {
      var n = parseInt(v.substring(pref.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

/**
 * Siguiente ID basado en el máximo existente (no en el número de filas,
 * así no se repite si se eliminó algún registro).
 */
function siguienteId(sheet, columna, prefijo, digitos) {
  var n = maxCorrelativo_(sheet, columna, prefijo) + 1;
  return String(prefijo).toUpperCase() + '-' + String(n).padStart(digitos || 4, '0');
}

/**
 * Evita inyección de fórmulas en Google Sheets: texto que empieza con = + - @
 * se guarda como texto literal.
 */
function limpiarTexto(valor) {
  if (typeof valor !== 'string') return valor;
  var t = valor.trim();
  if (/^[=+\-@]/.test(t)) return "'" + t;
  return t;
}

function bytesAHex_(bytes) {
  return bytes.map(function (b) {
    var h = (b < 0 ? b + 256 : b).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

/**
 * Hash de contraseña con sal aleatoria: s1$<sal>$<sha256>
 */
function hashPassword(password, salt) {
  var s = salt || Utilities.getUuid().replace(/-/g, '').substring(0, 16);
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    s + ':' + String(password),
    Utilities.Charset.UTF_8
  );
  return 's1$' + s + '$' + bytesAHex_(bytes);
}

function igualConstante_(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/**
 * Compara una contraseña con el valor guardado.
 * Acepta formato hash (s1$...) y texto plano antiguo (legacy = true para migrarlo).
 */
function verificarPassword(plano, guardado) {
  var g = String(guardado || '');
  var p = String(plano);
  if (g.indexOf('s1$') === 0) {
    var partes = g.split('$');
    return { ok: igualConstante_(hashPassword(p, partes[1]), g), legacy: false };
  }
  return { ok: g !== '' && igualConstante_(g, p), legacy: true };
}

/**
 * Política mínima de contraseña. Devuelve '' si es válida o el mensaje de error.
 */
function validarPoliticaPassword_(p) {
  p = String(p || '');
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'La contraseña debe combinar letras y números.';
  return '';
}

/**
 * Contraseña aleatoria para cuentas iniciales
 */
function generarPasswordTemporal_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  var out = '';
  for (var i = 0; i < 10; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out + '#7';
}
