/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Existencias.gs (Control de Suministros, Materiales y Consumo)
 * ============================================================================
 */

var STOCK_MINIMO_DEFAULT = 15;

/**
 * Stock mínimo de un registro de EXISTENCIAS. Si la columna STOCK_MINIMO está vacía
 * o no existe (hojas antiguas), se usa el valor por defecto.
 */
function stockMinimoDe_(item) {
  var n = parseFloat(item && item.STOCK_MINIMO);
  return (isNaN(n) || n < 0) ? STOCK_MINIMO_DEFAULT : n;
}
var ESTADOS_EXISTENCIA = ['BUENO', 'REGULAR', 'DETERIORADO', 'OBSOLETO', 'BAJA'];

/**
 * Lista las existencias de almacén con filtros opcionales y alertas de stock bajo
 * @param {string} token 
 * @param {Object} filtros - { busqueda, estado, soloBajoStock }
 * @returns {Object}
 */
function listarExistencias(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('EXISTENCIAS');
    if (!sheet) return { success: true, data: [] };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: [] };

    var items = sheetValuesToObjects(data);
    filtros = filtros || {};

    // Normalizar números y banderas de alerta
    items.forEach(function (item) {
      item.CANTIDAD = parseFloat(item.CANTIDAD) || 0;
      item.STOCK_MINIMO = stockMinimoDe_(item);
      item.esBajoStock = item.CANTIDAD <= item.STOCK_MINIMO;
      item.esCritico = item.CANTIDAD <= Math.floor(item.STOCK_MINIMO / 3);
    });

    if (filtros.estado && filtros.estado !== 'TODOS') {
      var est = String(filtros.estado).toUpperCase().trim();
      items = items.filter(function (x) { return String(x.ESTADO).toUpperCase() === est; });
    }

    if (filtros.soloBajoStock) {
      items = items.filter(function (x) { return x.esBajoStock; });
    }

    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      var q = String(filtros.busqueda).toLowerCase().trim();
      items = items.filter(function (x) {
        return (
          String(x.CODIGO).toLowerCase().indexOf(q) !== -1 ||
          String(x.DESCRIPCION).toLowerCase().indexOf(q) !== -1 ||
          String(x.CUENTA_CONTABLE).toLowerCase().indexOf(q) !== -1 ||
          String(x.ID_EXISTENCIA).toLowerCase().indexOf(q) !== -1
        );
      });
    }

    return { success: true, total: items.length, data: items };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Busca una existencia por su código único o código de barras
 * @param {string} token 
 * @param {string} codigo 
 * @returns {Object}
 */
function obtenerExistenciaPorCodigo(token, codigo) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    if (!codigo) return { success: false, message: 'Código de existencia requerido.' };
    var codBuscado = String(codigo).trim().toUpperCase();

    var ss = getDB();
    var sheet = ss.getSheetByName('EXISTENCIAS');
    var data = sheet.getDataRange().getValues();
    var items = sheetValuesToObjects(data);

    for (var i = 0; i < items.length; i++) {
      if (String(items[i].CODIGO).toUpperCase().trim() === codBuscado ||
        String(items[i].ID_EXISTENCIA).toUpperCase().trim() === codBuscado) {
        items[i].CANTIDAD = parseFloat(items[i].CANTIDAD) || 0;
        return { success: true, data: items[i] };
      }
    }

    return { success: false, message: 'No se encontró la existencia con código ' + codBuscado };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Registra un nuevo producto o suministro en existencias
 * @param {string} token 
 * @param {Object} existenciaData 
 * @returns {Object}
 */
function crearExistencia_(token, existenciaData) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!existenciaData.descripcion || !existenciaData.codigo) {
      return { success: false, message: 'El código y la descripción del producto son obligatorios.' };
    }

    var ss = getDB();
    var sheet = ss.getSheetByName('EXISTENCIAS');
    var data = sheet.getDataRange().getValues();

    var codigo = String(existenciaData.codigo).toUpperCase().trim();

    // Verificar código duplicado
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2]).toUpperCase().trim() === codigo) {
        return { success: false, message: 'El código de existencia ' + codigo + ' ya se encuentra en uso.' };
      }
    }

    var nuevoId = existenciaData.idExistencia ? existenciaData.idExistencia : siguienteId(sheet, 1, 'SUM', 3);
    var cantidadInicial = parseFloat(existenciaData.cantidad !== undefined ? existenciaData.cantidad : existenciaData.cantidadInicial) || 0;
    if (cantidadInicial < 0) {
      return { success: false, message: 'La cantidad inicial no puede ser negativa.' };
    }
    var stockMin = (existenciaData.stockMinimo === undefined || existenciaData.stockMinimo === '' || isNaN(parseFloat(existenciaData.stockMinimo)))
      ? STOCK_MINIMO_DEFAULT : parseFloat(existenciaData.stockMinimo);
    if (stockMin < 0) {
      return { success: false, message: 'El stock mínimo no puede ser negativo.' };
    }
    var estado = existenciaData.estado ? String(existenciaData.estado).toUpperCase().trim() : 'BUENO';
    if (ESTADOS_EXISTENCIA.indexOf(estado) === -1) {
      return { success: false, message: 'Estado inválido: ' + estado };
    }

    var nuevaFila = [
      nuevoId,
      existenciaData.cuentaContable || '',
      codigo,
      existenciaData.descripcion.trim(),
      cantidadInicial,
      estado,
      existenciaData.observacion || '',
      stockMin
    ];

    sheet.appendRow(nuevaFila.map(limpiarTexto));

    // Si se especificó inventario inicial, registrar el movimiento de apertura en Kardex
    if (cantidadInicial > 0) {
      registrarMovimientoInterno({
        tipoMovimiento: 'INGRESO POR COMPRA',
        codigo: codigo,
        descripcion: existenciaData.descripcion.trim(),
        cuentaContable: existenciaData.cuentaContable || '',
        ingreso: cantidadInicial,
        salida: 0,
        saldo: cantidadInicial,
        responsable: 'INVENTARIO INICIAL BODEGA',
        observacion: 'Carga inicial del producto en sistema',
        usuarioRegistro: usuario.email
      });
    }

    registrarAuditoria(
      usuario.email,
      'CREAR',
      'EXISTENCIAS',
      codigo,
      '',
      { descripcion: existenciaData.descripcion, cantidad: cantidadInicial, estado: estado, stockMinimo: stockMin }
    );

    return { success: true, message: 'Producto ' + codigo + ' registrado correctamente.', codigo: codigo };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/** Versión pública con bloqueo contra concurrencia */
function crearExistencia() { return ejecutarConBloqueo_(crearExistencia_, arguments); }

/**
 * Cambia el stock mínimo de un producto (Administrador / Inventariador)
 */
function actualizarStockMinimo_(token, codigo, nuevoMinimo) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);
    var n = parseFloat(nuevoMinimo);
    if (isNaN(n) || n < 0) return { success: false, message: 'El stock mínimo debe ser un número mayor o igual a cero.' };

    var sheet = getDB().getSheetByName('EXISTENCIAS');
    var data = sheet.getDataRange().getValues();
    var colMin = data[0].indexOf('STOCK_MINIMO');
    if (colMin === -1) return { success: false, message: 'Falta la columna STOCK_MINIMO. Ejecute "Inicializar / Reparar Base de Datos".' };

    var cod = String(codigo).toUpperCase().trim();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2]).toUpperCase().trim() === cod) {
        var previo = data[i][colMin];
        sheet.getRange(i + 1, colMin + 1).setValue(n);
        registrarAuditoria(usuario.email, 'MODIFICAR', 'EXISTENCIAS', cod, { stockMinimo: previo }, { stockMinimo: n });
        return { success: true, message: 'Stock mínimo de ' + cod + ' actualizado a ' + n + '.' };
      }
    }
    return { success: false, message: 'Producto no encontrado.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function actualizarStockMinimo() { return ejecutarConBloqueo_(actualizarStockMinimo_, arguments); }
