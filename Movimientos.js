/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Movimientos.gs (Kardex y Control de Movimientos de Inventario)
 * ============================================================================
 */

/**
 * Consulta el historial de movimientos de Kardex con filtros
 * @param {string} token 
 * @param {Object} filtros - { codigo, tipoMovimiento, fechaInicio, fechaFin, busqueda }
 * @returns {Object}
 */
function listarMovimientos(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('MOVIMIENTOS_EXISTENCIAS');
    if (!sheet) return { success: true, data: [] };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: [] };

    var items = sheetValuesToObjects(data);
    filtros = filtros || {};

    // Normalizar números
    items.forEach(function (m) {
      m.INGRESO = parseFloat(m.INGRESO) || 0;
      m.SALIDA = parseFloat(m.SALIDA) || 0;
      m.SALDO = parseFloat(m.SALDO) || 0;
    });

    if (filtros.codigo && filtros.codigo !== 'TODOS') {
      var cod = String(filtros.codigo).toUpperCase().trim();
      items = items.filter(function (x) { return String(x.CODIGO).toUpperCase() === cod; });
    }

    if (filtros.tipoMovimiento && filtros.tipoMovimiento !== 'TODOS') {
      var tm = String(filtros.tipoMovimiento).toUpperCase().trim();
      items = items.filter(function (x) { return String(x.TIPO_MOVIMIENTO).toUpperCase() === tm; });
    }

    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      var q = String(filtros.busqueda).toLowerCase().trim();
      items = items.filter(function (x) {
        return (
          String(x.ID_MOVIMIENTO).toLowerCase().indexOf(q) !== -1 ||
          String(x.CODIGO).toLowerCase().indexOf(q) !== -1 ||
          String(x.DESCRIPCION).toLowerCase().indexOf(q) !== -1 ||
          String(x.RESPONSABLE).toLowerCase().indexOf(q) !== -1 ||
          String(x.OBSERVACION).toLowerCase().indexOf(q) !== -1
        );
      });
    }

    if (filtros.fechaInicio) {
      var fi = new Date(filtros.fechaInicio + 'T00:00:00');
      items = items.filter(function (x) { return new Date(x.FECHA) >= fi; });
    }
    if (filtros.fechaFin) {
      var ff = new Date(filtros.fechaFin + 'T23:59:59');
      items = items.filter(function (x) { return new Date(x.FECHA) <= ff; });
    }

    // Ordenar descendente por fecha (más recientes primero)
    items.sort(function (a, b) {
      return new Date(b.FECHA) - new Date(a.FECHA);
    });

    return { success: true, total: items.length, data: items };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Registra una transacción en el Kardex y actualiza automáticamente el saldo en EXISTENCIAS
 * @param {string} token 
 * @param {Object} movData - { tipoMovimiento, codigo, cantidad, responsable, observacion }
 * @returns {Object}
 */
function registrarMovimiento_(token, movData) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!movData.codigo || !(movData.tipoMovimiento || movData.tipo) || !movData.cantidad) {
      return { success: false, message: 'Código de producto, tipo de movimiento y cantidad son requeridos.' };
    }

    var cantidad = parseFloat(movData.cantidad);
    if (isNaN(cantidad) || cantidad <= 0) {
      return { success: false, message: 'La cantidad debe ser un número positivo mayor a cero.' };
    }

    var tipo = String(movData.tipoMovimiento || movData.tipo).toUpperCase().trim();
    var tiposPermitidos = [
      'INGRESO POR COMPRA',
      'DEVOLUCIÓN',
      'ENTREGA',
      'CONSUMO',
      'AJUSTE',
      'BAJA'
    ];

    if (tiposPermitidos.indexOf(tipo) === -1) {
      return { success: false, message: 'Tipo de movimiento inválido: ' + tipo };
    }

    var ss = getDB();
    var sheetExistencias = ss.getSheetByName('EXISTENCIAS');
    var sheetMov = ss.getSheetByName('MOVIMIENTOS_EXISTENCIAS');

    var dataExistencias = sheetExistencias.getDataRange().getValues();
    var filaExistencia = -1;
    var itemActual = null;
    var codigoBuscado = String(movData.codigo).toUpperCase().trim();

    for (var i = 1; i < dataExistencias.length; i++) {
      if (String(dataExistencias[i][2]).toUpperCase().trim() === codigoBuscado) {
        filaExistencia = i + 1;
        itemActual = {
          cuentaContable: dataExistencias[i][1],
          codigo: dataExistencias[i][2],
          descripcion: dataExistencias[i][3],
          cantidadActual: parseFloat(dataExistencias[i][4]) || 0
        };
        break;
      }
    }

    if (!itemActual) {
      return { success: false, message: 'El producto con código ' + codigoBuscado + ' no existe en existencias.' };
    }

    // Determinar si es entrada o salida
    var esEntrada = (tipo === 'INGRESO POR COMPRA' || tipo === 'DEVOLUCIÓN');
    var esSalida = (tipo === 'ENTREGA' || tipo === 'CONSUMO' || tipo === 'BAJA');

    var ingreso = 0;
    var salida = 0;
    var nuevoSaldo = 0;

    if (esEntrada) {
      ingreso = cantidad;
      nuevoSaldo = itemActual.cantidadActual + ingreso;
    } else if (esSalida) {
      salida = cantidad;
      if (salida > itemActual.cantidadActual) {
        return {
          success: false,
          message: 'Stock insuficiente. Stock actual en bodega: ' + itemActual.cantidadActual + ', solicitado: ' + salida
        };
      }
      nuevoSaldo = itemActual.cantidadActual - salida;
    } else if (tipo === 'AJUSTE') {
      // Si es ajuste, se evalúa si aumenta o disminuye
      var direccion = movData.direccionAjuste || (movData.esPositivo ? 'POSITIVO' : 'NEGATIVO');
      if (direccion === 'POSITIVO' || direccion === 'INGRESO') {
        ingreso = cantidad;
        nuevoSaldo = itemActual.cantidadActual + ingreso;
      } else {
        salida = cantidad;
        if (salida > itemActual.cantidadActual) {
          return { success: false, message: 'El ajuste negativo excede el stock actual de ' + itemActual.cantidadActual };
        }
        nuevoSaldo = itemActual.cantidadActual - salida;
      }
    }

    // Generar ID de Movimiento
    var idMov = siguienteId(sheetMov, 1, 'MOV', 5);
    var fecha = getFechaHoraActual();

    var filaMovimiento = [
      idMov,
      fecha,
      tipo,
      itemActual.codigo,
      itemActual.descripcion,
      itemActual.cuentaContable,
      ingreso,
      salida,
      nuevoSaldo,
      limpiarTexto(movData.responsable || 'BODEGA GENERAL'),
      limpiarTexto(movData.observacion || ''),
      usuario.email
    ];

    // Registrar en Kardex
    sheetMov.appendRow(filaMovimiento);

    // Actualizar stock en EXISTENCIAS
    sheetExistencias.getRange(filaExistencia, 5).setValue(nuevoSaldo);

    // Registrar en auditoría
    registrarAuditoria(
      usuario.email,
      'KARDEX_' + tipo.replace(/\s+/g, '_'),
      'KARDEX',
      idMov,
      { codigo: itemActual.codigo, saldoAnterior: itemActual.cantidadActual },
      { tipo: tipo, ingreso: ingreso, salida: salida, nuevoSaldo: nuevoSaldo }
    );

    return {
      success: true,
      message: 'Movimiento ' + idMov + ' registrado con éxito. Nuevo saldo en stock: ' + nuevoSaldo,
      idMovimiento: idMov,
      nuevoSaldo: nuevoSaldo
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Función interna para registrar movimientos sin token de usuario (usada por importador y constatación)
 */
function registrarMovimientoInterno(movData) {
  try {
    var ss = getDB();
    var sheetMov = ss.getSheetByName('MOVIMIENTOS_EXISTENCIAS');
    if (!sheetMov) return;

    var idMov = siguienteId(sheetMov, 1, 'MOV', 5);
    var fecha = getFechaHoraActual();

    sheetMov.appendRow([
      idMov,
      fecha,
      movData.tipoMovimiento,
      movData.codigo,
      movData.descripcion,
      movData.cuentaContable || '',
      movData.ingreso || 0,
      movData.salida || 0,
      movData.saldo || 0,
      movData.responsable || '',
      movData.observacion || '',
      movData.usuarioRegistro || 'SISTEMA'
    ]);
  } catch (e) {
    Logger.log('Error registrarMovimientoInterno: ' + e.message);
  }
}

/** Versión pública con bloqueo contra concurrencia */
function registrarMovimiento() { return ejecutarConBloqueo_(registrarMovimiento_, arguments); }
