/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Bienes.gs (Gestión de Bienes Muebles e Inmuebles - BLD / BCA)
 * ============================================================================
 */

var CONDICIONES_BIEN = ['NUEVO', 'BUENO', 'REGULAR', 'MALO', 'DAÑADO', 'OBSOLETO', 'BAJA'];

/**
 * Consulta la lista de bienes muebles e inmuebles con filtros opcionales
 * @param {string} token 
 * @param {Object} filtros - { busqueda, tipo, condicion, custodio, ubicacion }
 * @returns {Object}
 */
function listarBienes(token, filtros) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    if (!sheet) return { success: true, data: [] };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, data: [] };

    var items = sheetValuesToObjects(data);
    filtros = filtros || {};

    if (filtros.tipo && filtros.tipo !== 'TODOS') {
      var t = String(filtros.tipo).toUpperCase();
      items = items.filter(function (x) { return String(x.TIPO_BIEN).toUpperCase() === t; });
    }

    if (filtros.condicion && filtros.condicion !== 'TODOS') {
      var c = String(filtros.condicion).toUpperCase();
      items = items.filter(function (x) { return String(x.CONDICION).toUpperCase() === c; });
    }

    if (filtros.custodio && filtros.custodio !== 'TODOS') {
      var cust = String(filtros.custodio).toLowerCase();
      items = items.filter(function (x) { return String(x.CUSTODIO).toLowerCase() === cust; });
    }

    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      var q = String(filtros.busqueda).toLowerCase().trim();
      items = items.filter(function (x) {
        return (
          String(x.CODIGO_BIEN).toLowerCase().indexOf(q) !== -1 ||
          String(x.BIEN).toLowerCase().indexOf(q) !== -1 ||
          String(x.SERIE).toLowerCase().indexOf(q) !== -1 ||
          String(x.MODELO).toLowerCase().indexOf(q) !== -1 ||
          String(x.MARCA).toLowerCase().indexOf(q) !== -1 ||
          String(x.CUSTODIO).toLowerCase().indexOf(q) !== -1 ||
          String(x.UBICACION).toLowerCase().indexOf(q) !== -1
        );
      });
    }

    return { success: true, total: items.length, data: items };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Busca un bien por su código exacto (utilizado por el lector QR de celular)
 * @param {string} token 
 * @param {string} codigoBien 
 * @returns {Object}
 */
function obtenerBienPorCodigo(token, codigoBien) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    if (!codigoBien) return { success: false, message: 'Código de bien no especificado.' };
    var codBuscado = String(codigoBien).trim().toUpperCase();

    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var data = sheet.getDataRange().getValues();
    var items = sheetValuesToObjects(data);

    for (var i = 0; i < items.length; i++) {
      if (String(items[i].CODIGO_BIEN).toUpperCase().trim() === codBuscado) {
        return { success: true, data: items[i] };
      }
    }

    return { success: false, message: 'No se encontró ningún bien con el código ' + codBuscado };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Genera el siguiente correlativo para BLD o BCA (ej. BLD-00004)
 * @param {string} tipo - 'BLD' o 'BCA'
 * @returns {string} Código generado
 */
function generarSiguienteCodigoBien(tipo) {
  var t = (tipo || 'BLD').toUpperCase();
  var sheet = getDB().getSheetByName('BIENES_MUEBLES_INMUEBLES');
  return siguienteId(sheet, 1, t, 5);
}

/**
 * Registra un nuevo bien patrimonial
 * @param {string} token 
 * @param {Object} bienData 
 * @returns {Object}
 */
function crearBien_(token, bienData) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!bienData.bien || !bienData.tipoBien) {
      return { success: false, message: 'Debe ingresar el nombre del bien y clasificar el tipo (BLD o BCA).' };
    }

    var tipo = String(bienData.tipoBien).toUpperCase().trim();
    if (tipo !== 'BLD' && tipo !== 'BCA') {
      return { success: false, message: 'El tipo de bien debe ser BLD (Larga Duración) o BCA (Control Administrativo).' };
    }

    var condicionNueva = bienData.condicion ? String(bienData.condicion).toUpperCase().trim() : 'BUENO';
    if (CONDICIONES_BIEN.indexOf(condicionNueva) === -1) {
      return { success: false, message: 'Condición inválida: ' + condicionNueva };
    }
    var valorCheck = parseFloat(bienData.valorContable || 0);
    if (isNaN(valorCheck) || valorCheck < 0) {
      return { success: false, message: 'El valor contable debe ser un número mayor o igual a cero.' };
    }

    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');

    // Generar código si no viene especificado
    var codigo = bienData.codigoBien && bienData.codigoBien.trim() !== ''
      ? String(bienData.codigoBien).toUpperCase().trim()
      : generarSiguienteCodigoBien(tipo);

    // Validar unicidad del código
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase().trim() === codigo) {
        return { success: false, message: 'El código de bien ' + codigo + ' ya se encuentra registrado.' };
      }
    }

    var fechaAdq = validarFechaAdquisicion_(bienData.fechaAdquisicion);
    if (fechaAdq === null) {
      return { success: false, message: 'La fecha de adquisición no es válida (use AAAA-MM-DD y no una fecha futura).' };
    }

    var fecha = getFechaHoraActual();
    var valorNum = parseFloat(bienData.valorContable) || 0;
    var vidaUtilNum = parseInt(bienData.vidaUtil, 10) || 0;

    var nuevaFila = [
      codigo,
      tipo,
      bienData.bien.trim(),
      bienData.serie || 'S/N',
      bienData.modelo || '',
      bienData.marca || '',
      bienData.color || '',
      bienData.material || '',
      bienData.dimension || '',
      condicionNueva,
      bienData.custodio || '',
      bienData.descripcionBien || '',
      bienData.cuentaContable || '',
      vidaUtilNum,
      valorNum,
      bienData.observacion || '',
      bienData.ubicacion || '',
      fecha,
      usuario.email,
      '',
      fechaAdq
    ];

    sheet.appendRow(nuevaFila.map(limpiarTexto));

    registrarAuditoria(
      usuario.email,
      'CREAR',
      'BIENES',
      codigo,
      '',
      { bien: bienData.bien, tipo: tipo, custodio: bienData.custodio, valor: valorNum }
    );

    return {
      success: true,
      message: 'Bien ' + codigo + ' registrado correctamente.',
      codigoBien: codigo
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Actualiza la información de un bien existente
 * @param {string} token 
 * @param {Object} bienData 
 * @returns {Object}
 */
function actualizarBien_(token, bienData) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!bienData.codigoBien) {
      return { success: false, message: 'Código de bien no especificado.' };
    }

    var codigo = String(bienData.codigoBien).toUpperCase().trim();
    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var data = sheet.getDataRange().getValues();

    var rowIndex = -1;
    var rowAnterior = null;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase().trim() === codigo) {
        rowIndex = i + 1;
        rowAnterior = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: 'Bien ' + codigo + ' no encontrado.' };
    }

    var tipo = bienData.tipoBien ? String(bienData.tipoBien).toUpperCase().trim() : rowAnterior[1];
    if (tipo !== 'BLD' && tipo !== 'BCA') {
      return { success: false, message: 'El tipo de bien debe ser BLD o BCA.' };
    }
    if (bienData.condicion !== undefined && CONDICIONES_BIEN.indexOf(String(bienData.condicion).toUpperCase().trim()) === -1) {
      return { success: false, message: 'Condición inválida: ' + bienData.condicion };
    }
    var valorNum = (bienData.valorContable !== undefined && bienData.valorContable !== '') ? parseFloat(bienData.valorContable) : rowAnterior[14];
    var vidaUtilNum = (bienData.vidaUtil !== undefined && bienData.vidaUtil !== '') ? parseInt(bienData.vidaUtil, 10) : rowAnterior[13];

    var filaActualizada = [
      codigo,
      tipo,
      bienData.bien !== undefined ? bienData.bien.trim() : rowAnterior[2],
      bienData.serie !== undefined ? bienData.serie : rowAnterior[3],
      bienData.modelo !== undefined ? bienData.modelo : rowAnterior[4],
      bienData.marca !== undefined ? bienData.marca : rowAnterior[5],
      bienData.color !== undefined ? bienData.color : rowAnterior[6],
      bienData.material !== undefined ? bienData.material : rowAnterior[7],
      bienData.dimension !== undefined ? bienData.dimension : rowAnterior[8],
      bienData.condicion !== undefined ? bienData.condicion : rowAnterior[9],
      bienData.custodio !== undefined ? bienData.custodio : rowAnterior[10],
      bienData.descripcionBien !== undefined ? bienData.descripcionBien : rowAnterior[11],
      bienData.cuentaContable !== undefined ? bienData.cuentaContable : rowAnterior[12],
      vidaUtilNum,
      valorNum,
      bienData.observacion !== undefined ? bienData.observacion : rowAnterior[15],
      bienData.ubicacion !== undefined ? bienData.ubicacion : rowAnterior[16],
      rowAnterior[17], // Conserva fecha original de registro
      rowAnterior[18]  // Conserva usuario original
    ];

    sheet.getRange(rowIndex, 1, 1, filaActualizada.length).setValues([filaActualizada.map(limpiarTexto)]);

    if (bienData.fechaAdquisicion !== undefined) {
      var fa = validarFechaAdquisicion_(bienData.fechaAdquisicion);
      if (fa === null) {
        return { success: false, message: 'Los datos se guardaron, pero la fecha de adquisición no es válida (use AAAA-MM-DD y no una fecha futura).' };
      }
      var colFa = data[0].indexOf('FECHA_ADQUISICION');
      if (colFa !== -1) sheet.getRange(rowIndex, colFa + 1).setNumberFormat('@').setValue(fa);
    }

    registrarAuditoria(
      usuario.email,
      'MODIFICAR',
      'BIENES',
      codigo,
      { bien: rowAnterior[2], custodio: rowAnterior[10], condicion: rowAnterior[9] },
      { bien: filaActualizada[2], custodio: filaActualizada[10], condicion: filaActualizada[9] }
    );

    return { success: true, message: 'Bien ' + codigo + ' actualizado correctamente.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Registra la baja de un bien institucional
 * @param {string} token 
 * @param {string} codigoBien 
 * @param {string} motivoBaja 
 * @returns {Object}
 */
function darDeBajaBien_(token, codigoBien, motivoBaja) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR']);

    var codigo = String(codigoBien).toUpperCase().trim();
    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase().trim() === codigo) {
        var fila = i + 1;
        var condAnterior = data[i][9];
        var obsAnterior = data[i][15];
        var nuevaObs = (obsAnterior ? obsAnterior + ' | ' : '') + 'BAJA REGISTRADA: ' + (motivoBaja || 'Por obsolescencia o daño');

        sheet.getRange(fila, 10).setValue('BAJA'); // CONDICION
        sheet.getRange(fila, 16).setValue(nuevaObs); // OBSERVACION

        registrarAuditoria(
          usuario.email,
          'BAJA',
          'BIENES',
          codigo,
          { condicion: condAnterior },
          { condicion: 'BAJA', motivo: motivoBaja }
        );

        return { success: true, message: 'Bien ' + codigo + ' dado de baja exitosamente.' };
      }
    }

    return { success: false, message: 'Bien no encontrado.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Elimina físicamente un bien (Exclusivo Administrador)
 * @param {string} token 
 * @param {string} codigoBien 
 * @returns {Object}
 */
function eliminarBien_(token, codigoBien) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR']);
    var codigo = String(codigoBien).toUpperCase().trim();

    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase().trim() === codigo) {
        var bienNombre = data[i][2];
        var colFoto = data[0].indexOf('FOTO_ID');
        var fotoId = colFoto !== -1 ? String(data[i][colFoto] || '').trim() : '';
        sheet.deleteRow(i + 1);
        if (fotoId) {
          try { DriveApp.getFileById(fotoId).setTrashed(true); } catch (eFoto) { /* foto ya inexistente */ }
        }

        registrarAuditoria(
          usuario.email,
          'ELIMINAR',
          'BIENES',
          codigo,
          bienNombre,
          'Bien eliminado físicamente'
        );

        return { success: true, message: 'Bien ' + codigo + ' eliminado del sistema.' };
      }
    }

    return { success: false, message: 'Bien no encontrado.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/** Versión pública con bloqueo contra concurrencia */
function crearBien() { return ejecutarConBloqueo_(crearBien_, arguments); }

/** Versión pública con bloqueo contra concurrencia */
function actualizarBien() { return ejecutarConBloqueo_(actualizarBien_, arguments); }

/** Versión pública con bloqueo contra concurrencia */
function darDeBajaBien() { return ejecutarConBloqueo_(darDeBajaBien_, arguments); }

/** Versión pública con bloqueo contra concurrencia */
function eliminarBien() { return ejecutarConBloqueo_(eliminarBien_, arguments); }

/**
 * Valida la fecha de adquisición. Devuelve '' si viene vacía, 'AAAA-MM-DD' si es válida, o null si es inválida.
 */
function validarFechaAdquisicion_(v) {
  if (v === undefined || v === null || String(v).trim() === '') return '';
  var t = String(v).trim().substring(0, 10);
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  if (d.getFullYear() !== parseInt(m[1], 10) || d.getMonth() !== parseInt(m[2], 10) - 1 || d.getDate() !== parseInt(m[3], 10)) return null;
  if (d.getTime() > new Date().getTime() || d.getFullYear() < 1950) return null;
  return t;
}
