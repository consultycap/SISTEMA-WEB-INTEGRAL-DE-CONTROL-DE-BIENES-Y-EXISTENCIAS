/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Importacion.gs (Carga Masiva de Archivos Excel / CSV)
 * ============================================================================
 */

/**
 * Valida un lote de registros antes de proceder a la inserción masiva
 * @param {string} token 
 * @param {string} tipoModulo - 'BIENES' o 'EXISTENCIAS'
 * @param {Array<Object>} registros 
 * @returns {Object} Informe con filas válidas, inválidas y advertencias
 */
function validarLoteImportacion(token, tipoModulo, registros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR']);

    if (!registros || !Array.isArray(registros) || registros.length === 0) {
      return { success: false, message: 'El archivo no contiene filas con datos para procesar.' };
    }

    var ss = getDB();
    var tipo = String(tipoModulo).toUpperCase().trim();
    var filasValidas = [];
    var filasConError = [];
    var codigosEnArchivo = {};

    if (tipo === 'BIENES') {
      var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
      var dataExistente = sheetBienes ? sheetBienes.getDataRange().getValues() : [];
      var codigosExistentes = {};
      for (var b = 1; b < dataExistente.length; b++) {
        codigosExistentes[String(dataExistente[b][0]).toUpperCase().trim()] = true;
      }

      var tiposValidos = ['BLD', 'BCA'];
      var estadosValidos = ['NUEVO', 'BUENO', 'REGULAR', 'MALO', 'DAÑADO', 'OBSOLETO', 'BAJA'];

      registros.forEach(function (row, idx) {
        var numFila = idx + 2;
        var errores = [];

        // Normalizar nombres de columnas comunes
        var codigo = String(row.CODIGO_BIEN || row.CODIGO || row.codigo || '').toUpperCase().trim();
        var tipoBien = String(row.TIPO_BIEN || row.TIPO || row.tipo || '').toUpperCase().trim();
        var bien = String(row.BIEN || row.DESCRIPCION_BIEN || row.NOMBRE || '').trim();
        var condicion = String(row.CONDICION || row.ESTADO || 'BUENO').toUpperCase().trim();
        var valor = parseFloat(row.VALOR_CONTABLE || row.VALOR || 0);

        if (!tipoBien || tiposValidos.indexOf(tipoBien) === -1) {
          errores.push('Tipo de bien inválido (debe ser BLD o BCA)');
        }
        if (!bien) {
          errores.push('El nombre/descripción del bien es obligatorio');
        }
        if (estadosValidos.indexOf(condicion) === -1) {
          errores.push('Condición "' + condicion + '" inválida');
        }
        if (isNaN(valor) || valor < 0) {
          errores.push('Valor contable debe ser un número >= 0');
        }

        // Si tiene código, verificar que no esté duplicado
        if (codigo) {
          if (codigosExistentes[codigo]) {
            errores.push('El código ' + codigo + ' ya existe en la base de datos');
          }
          if (codigosEnArchivo[codigo]) {
            errores.push('El código ' + codigo + ' está duplicado en el mismo archivo');
          }
          codigosEnArchivo[codigo] = true;
        }

        var fechaAdqImp = normalizarFechaImport_(row.FECHA_ADQUISICION);
        if (fechaAdqImp === null) {
          errores.push('Fecha de adquisición inválida (use AAAA-MM-DD o DD/MM/AAAA, no futura)');
        }

        if (errores.length > 0) {
          filasConError.push({ fila: numFila, data: row, errores: errores });
        } else {
          filasValidas.push({
            CODIGO_BIEN: codigo,
            TIPO_BIEN: tipoBien,
            BIEN: bien,
            SERIE: row.SERIE || 'S/N',
            MODELO: row.MODELO || '',
            MARCA: row.MARCA || '',
            COLOR: row.COLOR || '',
            MATERIAL: row.MATERIAL || '',
            DIMENSION: row.DIMENSION || '',
            CONDICION: condicion,
            CUSTODIO: row.CUSTODIO || '',
            DESCRIPCION_BIEN: row.DESCRIPCION_BIEN || bien,
            CUENTA_CONTABLE: row.CUENTA_CONTABLE || '',
            VIDA_UTIL: parseInt(row.VIDA_UTIL, 10) || 5,
            VALOR_CONTABLE: valor,
            OBSERVACION: row.OBSERVACION || 'Importado masivamente',
            UBICACION: row.UBICACION || '',
            FECHA_ADQUISICION: fechaAdqImp
          });
        }
      });

    } else if (tipo === 'EXISTENCIAS') {
      var sheetEx = ss.getSheetByName('EXISTENCIAS');
      var dataExExistente = sheetEx ? sheetEx.getDataRange().getValues() : [];
      var codigosExExistentes = {};
      for (var e = 1; e < dataExExistente.length; e++) {
        codigosExExistentes[String(dataExExistente[e][2]).toUpperCase().trim()] = true;
      }

      var estadosExValidos = ['BUENO', 'REGULAR', 'DETERIORADO', 'OBSOLETO', 'BAJA'];

      registros.forEach(function (row, idx) {
        var numFila = idx + 2;
        var errores = [];

        var codigo = String(row.CODIGO || row.CODIGO_EXISTENCIA || '').toUpperCase().trim();
        var descripcion = String(row.DESCRIPCION || row.PRODUCTO || '').trim();
        var cantidad = parseFloat(row.CANTIDAD || row.STOCK || 0);
        var estado = String(row.ESTADO || 'BUENO').toUpperCase().trim();

        if (!codigo) {
          errores.push('El código es obligatorio');
        } else {
          if (codigosExExistentes[codigo]) {
            errores.push('El código ' + codigo + ' ya existe en existencias');
          }
          if (codigosEnArchivo[codigo]) {
            errores.push('El código ' + codigo + ' está duplicado en el archivo');
          }
          codigosEnArchivo[codigo] = true;
        }

        if (!descripcion) {
          errores.push('La descripción del producto es obligatoria');
        }
        if (isNaN(cantidad) || cantidad < 0) {
          errores.push('La cantidad debe ser un número >= 0');
        }
        if (estadosExValidos.indexOf(estado) === -1) {
          errores.push('Estado "' + estado + '" no válido');
        }

        if (errores.length > 0) {
          filasConError.push({ fila: numFila, data: row, errores: errores });
        } else {
          filasValidas.push({
            ID_EXISTENCIA: row.ID_EXISTENCIA || '',
            CUENTA_CONTABLE: row.CUENTA_CONTABLE || '',
            CODIGO: codigo,
            DESCRIPCION: descripcion,
            CANTIDAD: cantidad,
            ESTADO: estado,
            OBSERVACION: row.OBSERVACION || 'Importado masivamente',
            STOCK_MINIMO: (row.STOCK_MINIMO === undefined || row.STOCK_MINIMO === '' || isNaN(parseFloat(row.STOCK_MINIMO))) ? STOCK_MINIMO_DEFAULT : Math.max(0, parseFloat(row.STOCK_MINIMO))
          });
        }
      });
    } else {
      return { success: false, message: 'Módulo de importación no reconocido: ' + tipoModulo };
    }

    return {
      success: true,
      totalProcesados: registros.length,
      totalValidos: filasValidas.length,
      totalErrores: filasConError.length,
      filasValidas: filasValidas,
      filasConError: filasConError
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Ejecuta la inserción masiva definitiva de filas validadas en Google Sheets
 * @param {string} token 
 * @param {string} tipoModulo 
 * @param {Array<Object>} filasAprobadas 
 * @returns {Object}
 */
function ejecutarImportacionMasiva_(token, tipoModulo, filasAprobadas) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR']);

    if (!filasAprobadas || filasAprobadas.length === 0) {
      return { success: false, message: 'No hay registros válidos para importar.' };
    }

    var ss = getDB();
    var tipo = String(tipoModulo).toUpperCase().trim();
    var fecha = getFechaHoraActual();

    if (tipo === 'BIENES') {
      var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
      var rowsToAppend = [];

      // Contadores en memoria por tipo (BLD/BCA): evita repetir el mismo código
      // para todas las filas sin código, y respeta códigos que ya vienen en el archivo.
      var contadores = {};
      ['BLD', 'BCA'].forEach(function (tp) {
        var max = maxCorrelativo_(sheetBienes, 1, tp);
        filasAprobadas.forEach(function (f) {
          var c = String(f.CODIGO_BIEN || '').toUpperCase().trim();
          if (c.indexOf(tp + '-') === 0) {
            var n = parseInt(c.substring(tp.length + 1), 10);
            if (!isNaN(n) && n > max) max = n;
          }
        });
        contadores[tp] = max;
      });

      filasAprobadas.forEach(function (b) {
        var cod = b.CODIGO_BIEN;
        if (!cod || cod === '') {
          var tp = String(b.TIPO_BIEN).toUpperCase().trim();
          contadores[tp]++;
          cod = tp + '-' + String(contadores[tp]).padStart(5, '0');
        }
        rowsToAppend.push([
          cod,
          b.TIPO_BIEN,
          b.BIEN,
          b.SERIE || 'S/N',
          b.MODELO || '',
          b.MARCA || '',
          b.COLOR || '',
          b.MATERIAL || '',
          b.DIMENSION || '',
          b.CONDICION || 'BUENO',
          b.CUSTODIO || '',
          b.DESCRIPCION_BIEN || b.BIEN,
          b.CUENTA_CONTABLE || '',
          parseInt(b.VIDA_UTIL, 10) || 5,
          parseFloat(b.VALOR_CONTABLE) || 0,
          b.OBSERVACION || 'Importado masivamente',
          b.UBICACION || '',
          fecha,
          usuario.email,
          '',
          normalizarFechaImport_(b.FECHA_ADQUISICION) || ''
        ]);
      });

      var lastRow = sheetBienes.getLastRow();
      sheetBienes.getRange(lastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend.map(function (r) { return r.map(limpiarTexto); }));

      registrarAuditoria(
        usuario.email,
        'IMPORTACION_MASIVA',
        'BIENES',
        'LOTE_' + rowsToAppend.length + '_REGISTROS',
        '',
        'Importados exitosamente ' + rowsToAppend.length + ' bienes'
      );

      return {
        success: true,
        message: 'Se importaron exitosamente ' + rowsToAppend.length + ' bienes patrimoniales.',
        totalImportados: rowsToAppend.length
      };

    } else if (tipo === 'EXISTENCIAS') {
      var sheetEx = ss.getSheetByName('EXISTENCIAS');
      var rowsExToAppend = [];
      var maxSum = maxCorrelativo_(sheetEx, 1, 'SUM');

      filasAprobadas.forEach(function (e, i) {
        var idEx = e.ID_EXISTENCIA || ('SUM-' + String(maxSum + i + 1).padStart(3, '0'));
        var cant = parseFloat(e.CANTIDAD) || 0;

        rowsExToAppend.push([
          idEx,
          e.CUENTA_CONTABLE || '',
          e.CODIGO,
          e.DESCRIPCION,
          cant,
          e.ESTADO || 'BUENO',
          e.OBSERVACION || 'Importación masiva',
          (e.STOCK_MINIMO === undefined || e.STOCK_MINIMO === '' || isNaN(parseFloat(e.STOCK_MINIMO))) ? STOCK_MINIMO_DEFAULT : parseFloat(e.STOCK_MINIMO)
        ]);

        // Registrar en Kardex si trae saldo inicial
        if (cant > 0) {
          registrarMovimientoInterno({
            tipoMovimiento: 'INGRESO POR COMPRA',
            codigo: e.CODIGO,
            descripcion: e.DESCRIPCION,
            cuentaContable: e.CUENTA_CONTABLE || '',
            ingreso: cant,
            salida: 0,
            saldo: cant,
            responsable: 'IMPORTACIÓN INICIAL',
            observacion: 'Carga masiva de existencias',
            usuarioRegistro: usuario.email
          });
        }
      });

      var lastExRow = sheetEx.getLastRow();
      sheetEx.getRange(lastExRow + 1, 1, rowsExToAppend.length, rowsExToAppend[0].length).setValues(rowsExToAppend.map(function (r) { return r.map(limpiarTexto); }));

      registrarAuditoria(
        usuario.email,
        'IMPORTACION_MASIVA',
        'EXISTENCIAS',
        'LOTE_' + rowsExToAppend.length + '_REGISTROS',
        '',
        'Importados exitosamente ' + rowsExToAppend.length + ' suministros'
      );

      return {
        success: true,
        message: 'Se importaron exitosamente ' + rowsExToAppend.length + ' productos en existencias.',
        totalImportados: rowsExToAppend.length
      };
    }

    return { success: false, message: 'Tipo no soportado.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
/** Versión pública con bloqueo contra concurrencia */
function ejecutarImportacionMasiva() { return ejecutarConBloqueo_(ejecutarImportacionMasiva_, arguments); }


/**
 * Normaliza la fecha de adquisición de una fila importada.
 * Acepta AAAA-MM-DD, DD/MM/AAAA, fecha de Excel (número) o vacío.
 * Devuelve '' si viene vacía, 'AAAA-MM-DD' si es válida, o null si no se entiende.
 */
function normalizarFechaImport_(v) {
  if (v === undefined || v === null || String(v).trim() === '') return '';
  var t = String(v).trim();
  if (/^\d{4,6}(\.\d+)?$/.test(t) && parseFloat(t) > 10000) {
    var d = new Date(Math.round((parseFloat(t) - 25569) * 86400 * 1000));
    t = d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  var m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t);
  if (m) t = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return validarFechaAdquisicion_(t);
}
