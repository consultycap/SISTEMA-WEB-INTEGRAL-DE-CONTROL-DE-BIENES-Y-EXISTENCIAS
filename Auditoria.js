/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Auditoria.gs (Trazabilidad y Registro de Cambios)
 * ============================================================================
 */

/**
 * Registra una acción en la hoja AUDITORIA
 * Campos: FECHA, USUARIO, ACCION, MODULO, REGISTRO_AFECTADO, VALOR_ANTERIOR, VALOR_NUEVO
 * 
 * @param {string} usuario - Email o ID del usuario que ejecuta
 * @param {string} accion - CREAR, MODIFICAR, ELIMINAR, CONSTATAR, LOGIN, IMPORTAR, etc.
 * @param {string} modulo - BIENES, EXISTENCIAS, CUSTODIOS, USUARIOS, KARDEX, SEGURIDAD
 * @param {string} registroAfectado - Código o ID del registro
 * @param {string|Object} valorAnterior - Datos previos o vacío
 * @param {string|Object} valorNuevo - Datos nuevos o resultado
 */
function registrarAuditoria(usuario, accion, modulo, registroAfectado, valorAnterior, valorNuevo) {
  try {
    var ss = getDB();
    var sheet = ss.getSheetByName('AUDITORIA');
    if (!sheet) {
      sheet = ss.insertSheet('AUDITORIA');
      sheet.appendRow(['FECHA', 'USUARIO', 'ACCION', 'MODULO', 'REGISTRO_AFECTADO', 'VALOR_ANTERIOR', 'VALOR_NUEVO']);
    }

    var fecha = getFechaHoraActual();
    var strAnterior = (typeof valorAnterior === 'object') ? JSON.stringify(valorAnterior) : String(valorAnterior || '');
    var strNuevo = (typeof valorNuevo === 'object') ? JSON.stringify(valorNuevo) : String(valorNuevo || '');

    // Limitar longitud de texto para no saturar celdas de Sheets
    if (strAnterior.length > 500) strAnterior = strAnterior.substring(0, 497) + '...';
    if (strNuevo.length > 500) strNuevo = strNuevo.substring(0, 497) + '...';

    sheet.appendRow([
      fecha,
      usuario || 'SISTEMA',
      String(accion || '').toUpperCase(),
      String(modulo || '').toUpperCase(),
      String(registroAfectado || ''),
      strAnterior,
      strNuevo
    ]);
  } catch (e) {
    Logger.log('Error al registrar auditoría: ' + e.message);
  }
}

/**
 * Consulta el historial de auditoría con filtros opcionales
 * @param {string} token 
 * @param {Object} filtros - { modulo, usuario, fechaInicio, fechaFin, limit }
 * @returns {Object}
 */
function obtenerAuditoria(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('AUDITORIA');
    if (!sheet) return { success: true, data: [] };

    // Solo se leen las últimas 3000 filas para que la bitácora no se vuelva lenta
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [] };
    var numCols = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, numCols).getValues();
    var desde = Math.max(2, lastRow - 2999);
    var cuerpo = sheet.getRange(desde, 1, lastRow - desde + 1, numCols).getValues();

    var items = sheetValuesToObjects(headers.concat(cuerpo));
    filtros = filtros || {};

    // Filtrar si se proporcionaron criterios
    if (filtros.modulo) {
      var mod = String(filtros.modulo).toUpperCase();
      items = items.filter(function (x) { return String(x.MODULO).toUpperCase() === mod; });
    }
    if (filtros.usuario) {
      var u = String(filtros.usuario).toLowerCase();
      items = items.filter(function (x) { return String(x.USUARIO).toLowerCase().indexOf(u) !== -1; });
    }
    if (filtros.accion) {
      var ac = String(filtros.accion).toUpperCase();
      items = items.filter(function (x) { return String(x.ACCION).toUpperCase() === ac; });
    }

    // Ordenar descendente por fecha
    items.sort(function (a, b) {
      return new Date(b.FECHA) - new Date(a.FECHA);
    });

    var limit = filtros.limit ? parseInt(filtros.limit, 10) : 200;
    var resultado = items.slice(0, limit);

    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, message: err.message };
  }
}