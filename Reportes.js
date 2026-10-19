/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Reportes.gs (Métricas, KPIs, Estadísticas y Generación de Reportes)
 * ============================================================================
 */

/**
 * Obtiene métricas consolidadas en tiempo real para el Dashboard principal
 * @param {string} token 
 * @returns {Object}
 */
function obtenerDashboardKPIs(token) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();

    // 1. Métricas de Bienes
    var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var dataBienes = sheetBienes ? sheetBienes.getDataRange().getValues() : [];

    var totalBienes = 0;
    var totalBLD = 0;
    var totalBCA = 0;
    var valorContableTotal = 0;
    var pendientesRevision = 0;
    var bienesPorCondicion = {
      NUEVO: 0,
      BUENO: 0,
      REGULAR: 0,
      MALO: 0,
      DAÑADO: 0,
      OBSOLETO: 0,
      BAJA: 0
    };
    var bienesPorCustodio = {};

    if (dataBienes.length > 1) {
      var colTipo = dataBienes[0].indexOf('TIPO_BIEN');
      var colCond = dataBienes[0].indexOf('CONDICION');
      var colValor = dataBienes[0].indexOf('VALOR_CONTABLE');
      var colCust = dataBienes[0].indexOf('CUSTODIO');

      for (var b = 1; b < dataBienes.length; b++) {
        var row = dataBienes[b];
        totalBienes++;
        var tipo = String(row[colTipo]).toUpperCase().trim();
        if (tipo === 'BLD') totalBLD++;
        if (tipo === 'BCA') totalBCA++;

        var cond = String(row[colCond]).toUpperCase().trim();
        if (bienesPorCondicion[cond] !== undefined) {
          bienesPorCondicion[cond]++;
        }
        if (cond === 'REGULAR' || cond === 'MALO' || cond === 'DAÑADO') {
          pendientesRevision++;
        }

        var val = parseFloat(row[colValor]) || 0;
        if (cond !== 'BAJA') {
          valorContableTotal += val;
        }

        var cust = String(row[colCust] || 'Sin Asignar').trim();
        if (cond !== 'BAJA') {
          bienesPorCustodio[cust] = (bienesPorCustodio[cust] || 0) + 1;
        }
      }
    }

    // Top 5 Custodios con más bienes
    var arrayCustodios = Object.keys(bienesPorCustodio).map(function (k) {
      return { custodio: k, total: bienesPorCustodio[k] };
    });
    arrayCustodios.sort(function (a, b) { return b.total - a.total; });
    var topCustodios = arrayCustodios.slice(0, 6);

    // 2. Métricas de Existencias
    var sheetEx = ss.getSheetByName('EXISTENCIAS');
    var dataEx = sheetEx ? sheetEx.getDataRange().getValues() : [];

    var totalProductos = 0;
    var cantidadDisponibleTotal = 0;
    var productosBajoMinimo = 0;
    var existenciasPorEstado = {};

    if (dataEx.length > 1) {
      var colCant = dataEx[0].indexOf('CANTIDAD');
      var colEst = dataEx[0].indexOf('ESTADO');
      var colMin = dataEx[0].indexOf('STOCK_MINIMO');

      for (var e = 1; e < dataEx.length; e++) {
        totalProductos++;
        var cant = parseFloat(dataEx[e][colCant]) || 0;
        cantidadDisponibleTotal += cant;
        var minRaw = colMin !== -1 ? parseFloat(dataEx[e][colMin]) : NaN;
        if (cant <= (isNaN(minRaw) || minRaw < 0 ? STOCK_MINIMO_DEFAULT : minRaw)) {
          productosBajoMinimo++;
        }
        var est = String(dataEx[e][colEst]).toUpperCase().trim();
        existenciasPorEstado[est] = (existenciasPorEstado[est] || 0) + 1;
      }
    }

    // 3. Movimientos del Mes
    var sheetMov = ss.getSheetByName('MOVIMIENTOS_EXISTENCIAS');
    var dataMov = sheetMov ? sheetMov.getDataRange().getValues() : [];
    var movimientosMesActual = 0;
    var totalEntradasMes = 0;
    var totalSalidasMes = 0;

    var mesActual = new Date().getMonth();
    var anioActual = new Date().getFullYear();

    if (dataMov.length > 1) {
      var colFechaMov = dataMov[0].indexOf('FECHA');
      var colIng = dataMov[0].indexOf('INGRESO');
      var colSal = dataMov[0].indexOf('SALIDA');

      for (var m = 1; m < dataMov.length; m++) {
        var fStr = dataMov[m][colFechaMov];
        var d = new Date(fStr);
        if (!isNaN(d.getTime())) {
          if (d.getMonth() === mesActual && d.getFullYear() === anioActual) {
            movimientosMesActual++;
            totalEntradasMes += (parseFloat(dataMov[m][colIng]) || 0);
            totalSalidasMes += (parseFloat(dataMov[m][colSal]) || 0);
          }
        }
      }
    }

    // 4. Métricas de Constatación (Diferencias encontradas)
    var sheetConstEx = ss.getSheetByName('CONSTACION_EXISTENCIAS');
    var dataConstEx = sheetConstEx ? sheetConstEx.getDataRange().getValues() : [];
    var diferenciasDetectadas = 0;

    if (dataConstEx.length > 1) {
      var colDif = dataConstEx[0].indexOf('DIFERENCIA');
      for (var c = 1; c < dataConstEx.length; c++) {
        var dif = parseFloat(dataConstEx[c][colDif]) || 0;
        if (dif !== 0) {
          diferenciasDetectadas++;
        }
      }
    }

    return {
      success: true,
      kpis: {
        bienes: {
          totalBienes: totalBienes,
          totalBLD: totalBLD,
          totalBCA: totalBCA,
          valorContableTotal: valorContableTotal,
          pendientesRevision: pendientesRevision,
          bienesPorCondicion: bienesPorCondicion,
          topCustodios: topCustodios
        },
        existencias: {
          totalProductos: totalProductos,
          cantidadDisponibleTotal: cantidadDisponibleTotal,
          productosBajoMinimo: productosBajoMinimo,
          movimientosMesActual: movimientosMesActual,
          totalEntradasMes: totalEntradasMes,
          totalSalidasMes: totalSalidasMes,
          existenciasPorEstado: existenciasPorEstado,
          diferenciasDetectadas: diferenciasDetectadas
        }
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Genera datos consolidados para exportación de bienes a Excel o PDF
 * @param {string} token 
 * @param {Object} filtros 
 * @returns {Object}
 */
function generarReporteBienes(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var data = sheet.getDataRange().getValues();
    var items = sheetValuesToObjects(data);

    filtros = filtros || {};
    function igual(a, b) { return String(a).trim().toUpperCase() === String(b).trim().toUpperCase(); }
    if (filtros.tipo && filtros.tipo !== 'TODOS') {
      items = items.filter(function (x) { return igual(x.TIPO_BIEN, filtros.tipo); });
    }
    if (filtros.condicion && filtros.condicion !== 'TODOS') {
      items = items.filter(function (x) { return igual(x.CONDICION, filtros.condicion); });
    }
    if (filtros.custodio && filtros.custodio !== 'TODOS') {
      items = items.filter(function (x) { return igual(x.CUSTODIO, filtros.custodio); });
    }
    if (filtros.ubicacion && filtros.ubicacion !== 'TODOS') {
      items = items.filter(function (x) { return igual(x.UBICACION, filtros.ubicacion); });
    }

    var valorTotal = items.reduce(function (acc, cur) {
      return acc + (parseFloat(cur.VALOR_CONTABLE) || 0);
    }, 0);

    return {
      success: true,
      titulo: 'Reporte Oficial de Bienes Muebles e Inmuebles',
      fechaGeneracion: getFechaHoraActual(),
      totalRegistros: items.length,
      valorTotal: valorTotal,
      data: items
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Genera datos consolidados para exportación del reporte de existencias y suministros
 * @param {string} token 
 * @param {Object} filtros 
 * @returns {Object}
 */
function generarReporteExistencias(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('EXISTENCIAS');
    var data = sheet.getDataRange().getValues();
    var items = sheetValuesToObjects(data);

    filtros = filtros || {};
    items.forEach(function (x) {
      x.CANTIDAD = parseFloat(x.CANTIDAD) || 0;
      x.STOCK_MINIMO = stockMinimoDe_(x);
      x.ALERTA = x.CANTIDAD <= Math.floor(x.STOCK_MINIMO / 3) ? 'CRÍTICO' : (x.CANTIDAD <= x.STOCK_MINIMO ? 'BAJO MÍNIMO' : 'OK');
    });
    if (filtros.estado && filtros.estado !== 'TODOS') {
      items = items.filter(function (x) { return String(x.ESTADO).trim().toUpperCase() === String(filtros.estado).trim().toUpperCase(); });
    }
    if (filtros.soloBajoStock) {
      items = items.filter(function (x) { return x.CANTIDAD <= x.STOCK_MINIMO; });
    }

    var stockTotal = items.reduce(function (acc, cur) {
      return acc + (parseFloat(cur.CANTIDAD) || 0);
    }, 0);

    return {
      success: true,
      titulo: 'Reporte Oficial de Existencias y Suministros de Almacén',
      fechaGeneracion: getFechaHoraActual(),
      totalItems: items.length,
      stockTotal: stockTotal,
      data: items
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Genera datos del Kardex para exportación (con rango de fechas y tipo)
 * @param {Object} filtros - { fechaInicio, fechaFin, tipoMovimiento, codigo }
 */
function generarReporteMovimientos(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var sheet = getDB().getSheetByName('MOVIMIENTOS_EXISTENCIAS');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, titulo: 'Reporte de Kardex', fechaGeneracion: getFechaHoraActual(), totalItems: 0, data: [] };
    }
    var items = sheetValuesToObjects(sheet.getDataRange().getValues());
    filtros = filtros || {};

    if (filtros.tipoMovimiento && filtros.tipoMovimiento !== 'TODOS') {
      var tm = String(filtros.tipoMovimiento).trim().toUpperCase();
      items = items.filter(function (x) { return String(x.TIPO_MOVIMIENTO).trim().toUpperCase() === tm; });
    }
    if (filtros.codigo && filtros.codigo !== 'TODOS') {
      var cod = String(filtros.codigo).trim().toUpperCase();
      items = items.filter(function (x) { return String(x.CODIGO).trim().toUpperCase() === cod; });
    }
    if (filtros.fechaInicio) {
      var fi = new Date(filtros.fechaInicio + 'T00:00:00');
      items = items.filter(function (x) { return new Date(String(x.FECHA).replace(' ', 'T')) >= fi; });
    }
    if (filtros.fechaFin) {
      var ff = new Date(filtros.fechaFin + 'T23:59:59');
      items = items.filter(function (x) { return new Date(String(x.FECHA).replace(' ', 'T')) <= ff; });
    }

    items.sort(function (a, b) { return new Date(String(a.FECHA).replace(' ', 'T')) - new Date(String(b.FECHA).replace(' ', 'T')); });

    var entradas = 0, salidas = 0;
    items.forEach(function (x) {
      entradas += parseFloat(x.INGRESO) || 0;
      salidas += parseFloat(x.SALIDA) || 0;
    });

    return {
      success: true,
      titulo: 'Reporte de Kardex de Existencias',
      fechaGeneracion: getFechaHoraActual(),
      totalItems: items.length,
      totalEntradas: entradas,
      totalSalidas: salidas,
      data: items
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Convierte el texto de una fecha de la hoja a Date (o null)
 */
function parseFechaDep_(v) {
  if (!v) return null;
  var t = String(v).trim().substring(0, 10);
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

/**
 * Reporte de depreciación en línea recta, al día de hoy.
 *   depreciable = valor contable - valor residual (% configurable)
 *   mensual     = depreciable / (vida útil en meses)
 *   acumulada   = mensual × meses transcurridos (sin superar lo depreciable)
 * Usa la FECHA_ADQUISICION; si no existe, usa la fecha de registro en el sistema
 * y lo indica en la columna BASE_FECHA.
 * @param {Object} filtros - { tipo: 'BLD'|'BCA'|'TODOS' (por defecto BLD), custodio, incluirBajas }
 */
function generarReporteDepreciacion(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);
    filtros = filtros || {};

    var sheet = getDB().getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var items = sheetValuesToObjects(sheet.getDataRange().getValues());
    var tipo = filtros.tipo ? String(filtros.tipo).toUpperCase() : 'BLD';
    var residualPct = residualConfigurado_();
    var hoy = new Date();

    items = items.filter(function (x) {
      if (tipo !== 'TODOS' && String(x.TIPO_BIEN).trim().toUpperCase() !== tipo) return false;
      if (filtros.custodio && filtros.custodio !== 'TODOS' &&
        String(x.CUSTODIO).trim().toUpperCase() !== String(filtros.custodio).trim().toUpperCase()) return false;
      if (!filtros.incluirBajas && String(x.CONDICION).trim().toUpperCase() === 'BAJA') return false;
      return true;
    });

    var totales = { valor: 0, residual: 0, acumulada: 0, libros: 0 };
    var filas = items.map(function (x) {
      var valor = parseFloat(x.VALOR_CONTABLE) || 0;
      var vida = parseInt(x.VIDA_UTIL, 10) || 0;
      var base = parseFechaDep_(x.FECHA_ADQUISICION);
      var baseTxt = 'ADQUISICIÓN';
      if (!base) { base = parseFechaDep_(x.FECHA_REGISTRO); baseTxt = 'REGISTRO (estimada)'; }

      var meses = 0;
      if (base) {
        meses = (hoy.getFullYear() - base.getFullYear()) * 12 + (hoy.getMonth() - base.getMonth());
        if (hoy.getDate() < base.getDate()) meses -= 1;
        if (meses < 0) meses = 0;
      }

      var residual = valor * residualPct / 100;
      var depreciable = Math.max(0, valor - residual);
      var mensual = 0, acumulada = 0, estado;

      if (vida <= 0) {
        estado = 'SIN VIDA ÚTIL';
      } else {
        mensual = depreciable / (vida * 12);
        acumulada = Math.min(depreciable, mensual * meses);
        estado = meses >= vida * 12 ? 'TOTALMENTE DEPRECIADO' : 'EN DEPRECIACIÓN';
      }
      var libros = valor - acumulada;

      function r2(n) { return Math.round(n * 100) / 100; }
      totales.valor += valor; totales.residual += residual; totales.acumulada += acumulada; totales.libros += libros;

      return {
        CODIGO_BIEN: x.CODIGO_BIEN, TIPO_BIEN: x.TIPO_BIEN, BIEN: x.BIEN, CUSTODIO: x.CUSTODIO,
        FECHA_BASE: base ? Utilities.formatDate(base, Session.getScriptTimeZone() || 'GMT-5', 'yyyy-MM-dd') : '',
        BASE_FECHA: baseTxt,
        VIDA_UTIL: vida,
        VALOR_CONTABLE: r2(valor),
        VALOR_RESIDUAL: r2(residual),
        DEPRECIACION_MENSUAL: r2(mensual),
        MESES_TRANSCURRIDOS: meses,
        DEPRECIACION_ACUMULADA: r2(acumulada),
        VALOR_EN_LIBROS: r2(libros),
        ESTADO_DEP: estado
      };
    });

    function r2(n) { return Math.round(n * 100) / 100; }
    return {
      success: true,
      titulo: 'Reporte de Depreciación de Bienes (línea recta)',
      fechaGeneracion: getFechaHoraActual(),
      residualPorcentaje: residualPct,
      totalRegistros: filas.length,
      totales: { valor: r2(totales.valor), residual: r2(totales.residual), acumulada: r2(totales.acumulada), libros: r2(totales.libros) },
      valorTotal: r2(totales.valor),
      data: filas
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
