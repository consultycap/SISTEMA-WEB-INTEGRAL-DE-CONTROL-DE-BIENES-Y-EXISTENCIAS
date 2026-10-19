/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Constatacion.gs (Constatación Física Móvil con Cámara / QR)
 * ============================================================================
 */

/**
 * Registra la constatación física de un bien patrimonial escaneado con la cámara
 * @param {string} token 
 * @param {Object} dataConstatacion - { codigoBien, condicionFisica, novedad, actualizarCondicionEnBien }
 * @returns {Object}
 */
function registrarConstatacionBien_(token, dataConstatacion) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!dataConstatacion.codigoBien) {
      return { success: false, message: 'Código de bien no especificado.' };
    }

    var codigo = String(dataConstatacion.codigoBien).toUpperCase().trim();
    var ss = getDB();
    var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var sheetConst = ss.getSheetByName('CONSTACION_BIENES');

    // Obtener datos actuales del bien
    var dataBienes = sheetBienes.getDataRange().getValues();
    var filaBien = -1;
    var bienActual = null;

    for (var i = 1; i < dataBienes.length; i++) {
      if (String(dataBienes[i][0]).toUpperCase().trim() === codigo) {
        filaBien = i + 1;
        bienActual = {
          codigo: dataBienes[i][0],
          nombre: dataBienes[i][2],
          custodio: dataBienes[i][10],
          ubicacion: dataBienes[i][16],
          condicionSistema: dataBienes[i][9]
        };
        break;
      }
    }

    if (!bienActual) {
      return { success: false, message: 'No se encontró el bien con código ' + codigo + ' en la base de datos.' };
    }

    var condicionFisica = dataConstatacion.condicionFisica ? String(dataConstatacion.condicionFisica).toUpperCase().trim() : bienActual.condicionSistema;
    if (CONDICIONES_BIEN.indexOf(condicionFisica) === -1) {
      return { success: false, message: 'Condición física inválida: ' + condicionFisica };
    }
    var novedad = dataConstatacion.novedad ? limpiarTexto(String(dataConstatacion.novedad)) : 'Constatado conforme';
    var fecha = getFechaHoraActual();
    var idConst = 'CB-' + Utilities.formatDate(new Date(), "GMT-5", "yyyyMMdd-HHmmss") + '-' + Math.floor(Math.random() * 900 + 100);

    // Registrar en CONSTACION_BIENES
    sheetConst.appendRow([
      idConst,
      fecha,
      bienActual.codigo,
      bienActual.nombre,
      bienActual.custodio,
      bienActual.ubicacion,
      bienActual.condicionSistema,
      condicionFisica,
      novedad,
      usuario.email
    ]);

    // Si se solicitó actualizar la condición en el catálogo del bien
    if (dataConstatacion.actualizarCondicionEnBien && condicionFisica !== bienActual.condicionSistema) {
      sheetBienes.getRange(filaBien, 10).setValue(condicionFisica);
      var obsActual = sheetBienes.getRange(filaBien, 16).getValue();
      sheetBienes.getRange(filaBien, 16).setValue(
        (obsActual ? obsActual + ' | ' : '') + 'Condición actualizada en constatación física ' + fecha + ': ' + condicionFisica
      );
    }

    registrarAuditoria(
      usuario.email,
      'CONSTATACION_BIEN',
      'CONSTATACION',
      codigo,
      { condicionSistema: bienActual.condicionSistema },
      { condicionFisica: condicionFisica, novedad: novedad }
    );

    return {
      success: true,
      message: 'Constatación física del bien ' + codigo + ' guardada exitosamente.',
      idConstatacion: idConst
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Registra la constatación física de existencias / suministros (conteo físico vs sistema)
 * @param {string} token 
 * @param {Object} dataConstatacion - { codigo, stockFisico, estado, observacion, aplicarAjusteKardex }
 * @returns {Object}
 */
function registrarConstatacionExistencia_(token, dataConstatacion) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!dataConstatacion.codigo || dataConstatacion.stockFisico === undefined) {
      return { success: false, message: 'Código de producto y cantidad física son requeridos.' };
    }

    var codigo = String(dataConstatacion.codigo).toUpperCase().trim();
    var stockFisico = parseFloat(dataConstatacion.stockFisico);
    if (isNaN(stockFisico) || stockFisico < 0) {
      return { success: false, message: 'La cantidad física debe ser un número igual o mayor a cero.' };
    }

    var ss = getDB();
    var sheetEx = ss.getSheetByName('EXISTENCIAS');
    var sheetConst = ss.getSheetByName('CONSTACION_EXISTENCIAS');

    var dataEx = sheetEx.getDataRange().getValues();
    var itemActual = null;
    var filaEx = -1;

    for (var i = 1; i < dataEx.length; i++) {
      if (String(dataEx[i][2]).toUpperCase().trim() === codigo) {
        filaEx = i + 1;
        itemActual = {
          cuentaContable: dataEx[i][1],
          codigo: dataEx[i][2],
          descripcion: dataEx[i][3],
          stockSistema: parseFloat(dataEx[i][4]) || 0,
          estado: dataEx[i][5]
        };
        break;
      }
    }

    if (!itemActual) {
      return { success: false, message: 'No se encontró la existencia con código ' + codigo };
    }

    var diferencia = stockFisico - itemActual.stockSistema;
    var fecha = getFechaHoraActual();
    var idConst = 'CE-' + Utilities.formatDate(new Date(), "GMT-5", "yyyyMMdd-HHmmss");
    var estadoFisico = dataConstatacion.estado ? String(dataConstatacion.estado).toUpperCase().trim() : itemActual.estado;
    var observacion = dataConstatacion.observacion ? limpiarTexto(String(dataConstatacion.observacion)) : '';
    if (ESTADOS_EXISTENCIA.indexOf(estadoFisico) === -1) {
      return { success: false, message: 'Estado físico inválido: ' + estadoFisico };
    }

    // Registrar en CONSTACION_EXISTENCIAS
    sheetConst.appendRow([
      idConst,
      fecha,
      itemActual.codigo,
      itemActual.descripcion,
      itemActual.stockSistema,
      stockFisico,
      diferencia,
      estadoFisico,
      observacion,
      usuario.email
    ]);

    // Actualizar el estado del producto si cambió
    if (estadoFisico !== itemActual.estado) {
      sheetEx.getRange(filaEx, 6).setValue(estadoFisico);
    }

    // Si hay diferencia y se solicita ajustar Kardex automáticamente
    if (dataConstatacion.aplicarAjusteKardex && diferencia !== 0) {
      var tipoAjuste = 'AJUSTE';
      var ingreso = diferencia > 0 ? diferencia : 0;
      var salida = diferencia < 0 ? Math.abs(diferencia) : 0;

      registrarMovimientoInterno({
        tipoMovimiento: tipoAjuste,
        codigo: itemActual.codigo,
        descripcion: itemActual.descripcion,
        cuentaContable: itemActual.cuentaContable,
        ingreso: ingreso,
        salida: salida,
        saldo: stockFisico,
        responsable: 'CONSTATACIÓN FÍSICA INVENTARIO',
        observacion: 'Ajuste automático por diferencia física: ' + diferencia + ' | ' + observacion,
        usuarioRegistro: usuario.email
      });

      // Actualizar cantidad en EXISTENCIAS
      sheetEx.getRange(filaEx, 5).setValue(stockFisico);
    }

    registrarAuditoria(
      usuario.email,
      'CONSTATACION_EXISTENCIA',
      'CONSTATACION',
      codigo,
      { stockSistema: itemActual.stockSistema },
      { stockFisico: stockFisico, diferencia: diferencia, ajusteAplicado: !!dataConstatacion.aplicarAjusteKardex }
    );

    return {
      success: true,
      message: 'Constatación guardada. ' + (diferencia === 0 ? 'Stock físico coincide exactamente con sistema.' : 'Diferencia detectada: ' + diferencia),
      idConstatacion: idConst,
      diferencia: diferencia
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
/** Versión pública con bloqueo contra concurrencia */
function registrarConstatacionBien() { return ejecutarConBloqueo_(registrarConstatacionBien_, arguments); }

/** Versión pública con bloqueo contra concurrencia */
function registrarConstatacionExistencia() { return ejecutarConBloqueo_(registrarConstatacionExistencia_, arguments); }

/**
 * Historial de constataciones (solo lectura)
 * @param {string} tipo - 'BIENES' o 'EXISTENCIAS'
 * @param {Object} filtros - { busqueda, soloDiferencias, limit }
 */
function listarConstataciones(token, tipo, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);
    filtros = filtros || {};

    var esBienes = String(tipo).toUpperCase() !== 'EXISTENCIAS';
    var sheet = getDB().getSheetByName(esBienes ? 'CONSTACION_BIENES' : 'CONSTACION_EXISTENCIAS');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

    var items = sheetValuesToObjects(sheet.getDataRange().getValues());

    if (filtros.soloDiferencias) {
      items = items.filter(function (x) {
        return esBienes
          ? String(x.CONDICION_SISTEMA).trim().toUpperCase() !== String(x.CONDICION_FISICA).trim().toUpperCase()
          : (parseFloat(x.DIFERENCIA) || 0) !== 0;
      });
    }
    if (filtros.busqueda && String(filtros.busqueda).trim() !== '') {
      var q = String(filtros.busqueda).toLowerCase().trim();
      items = items.filter(function (x) {
        return Object.keys(x).some(function (k) {
          return k !== '_rowIndex' && String(x[k]).toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    items.sort(function (a, b) {
      return new Date(String(b.FECHA).replace(' ', 'T')) - new Date(String(a.FECHA).replace(' ', 'T'));
    });

    var limit = filtros.limit ? parseInt(filtros.limit, 10) : 300;
    return { success: true, total: items.length, data: items.slice(0, limit) };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
