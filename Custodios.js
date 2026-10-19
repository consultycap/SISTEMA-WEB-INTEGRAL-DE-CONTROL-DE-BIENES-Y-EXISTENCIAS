/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Custodios.gs (Gestión de Responsables y Asignaciones)
 * ============================================================================
 */

/**
 * Obtiene todos los custodios junto con la cantidad de bienes que tienen a cargo
 * @param {string} token 
 * @returns {Object}
 */
function listarCustodios(token) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheetCust = ss.getSheetByName('CUSTODIOS');
    var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');

    if (!sheetCust) return { success: true, data: [] };

    var dataCust = sheetCust.getDataRange().getValues();
    var custodios = sheetValuesToObjects(dataCust);

    // Contar bienes por custodio
    var mapaBienesPorCustodio = {};
    if (sheetBienes && sheetBienes.getLastRow() > 1) {
      var dataBienes = sheetBienes.getDataRange().getValues();
      var colCustodio = dataBienes[0].indexOf('CUSTODIO');
      var colCondicion = dataBienes[0].indexOf('CONDICION');

      for (var b = 1; b < dataBienes.length; b++) {
        var custNombre = String(dataBienes[b][colCustodio]).trim();
        var cond = String(dataBienes[b][colCondicion]).toUpperCase().trim();
        // Solo contar bienes activos (no dados de baja)
        if (custNombre && cond !== 'BAJA') {
          mapaBienesPorCustodio[custNombre] = (mapaBienesPorCustodio[custNombre] || 0) + 1;
        }
      }
    }

    custodios.forEach(function (c) {
      c.totalBienesAsignados = mapaBienesPorCustodio[String(c.NOMBRE).trim()] || 0;
    });

    return { success: true, data: custodios };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Registra un nuevo custodio
 * @param {string} token 
 * @param {Object} custodioData 
 * @returns {Object}
 */
function crearCustodio_(token, custodioData) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!custodioData.cedula || !custodioData.nombre) {
      return { success: false, message: 'La cédula y el nombre completo son obligatorios.' };
    }

    var ss = getDB();
    var sheet = ss.getSheetByName('CUSTODIOS');
    var data = sheet.getDataRange().getValues();

    var cedulaStr = String(custodioData.cedula).trim();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === cedulaStr) {
        return { success: false, message: 'Ya existe un custodio con el número de identificación ' + cedulaStr };
      }
    }

    var nuevoId = siguienteId(sheet, 1, 'CUST', 3);
    var estado = custodioData.estado ? String(custodioData.estado).toUpperCase().trim() : 'ACTIVO';
    if (estado !== 'ACTIVO' && estado !== 'INACTIVO') estado = 'ACTIVO';

    sheet.appendRow([
      nuevoId,
      cedulaStr,
      limpiarTexto(String(custodioData.nombre)),
      limpiarTexto(custodioData.cargo || ''),
      limpiarTexto(custodioData.departamento || ''),
      limpiarTexto(custodioData.ubicacion || ''),
      estado
    ]);

    registrarAuditoria(
      usuario.email,
      'CREAR',
      'CUSTODIOS',
      nuevoId,
      '',
      { nombre: custodioData.nombre, cedula: cedulaStr, cargo: custodioData.cargo }
    );

    return { success: true, message: 'Custodio registrado correctamente.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Actualiza la información de un custodio
 * @param {string} token 
 * @param {Object} custodioData 
 * @returns {Object}
 */
function actualizarCustodio_(token, custodioData) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);

    if (!custodioData.idCustodio) {
      return { success: false, message: 'ID del custodio no especificado.' };
    }

    var ss = getDB();
    var sheet = ss.getSheetByName('CUSTODIOS');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(custodioData.idCustodio).trim()) {
        var fila = i + 1;
        if (custodioData.cedula) {
          var nuevaCedula = String(custodioData.cedula).trim();
          for (var k = 1; k < data.length; k++) {
            if (k !== i && String(data[k][1]).trim() === nuevaCedula) {
              return { success: false, message: 'Esa identificación ya pertenece a otro custodio.' };
            }
          }
        }
        var nombreViejo = data[i][2];
        var nuevoNombre = custodioData.nombre ? limpiarTexto(String(custodioData.nombre)) : nombreViejo;

        sheet.getRange(fila, 2).setValue(custodioData.cedula ? String(custodioData.cedula).trim() : data[i][1]);
        sheet.getRange(fila, 3).setValue(nuevoNombre);
        sheet.getRange(fila, 4).setValue(custodioData.cargo !== undefined ? limpiarTexto(custodioData.cargo) : data[i][3]);
        sheet.getRange(fila, 5).setValue(custodioData.departamento !== undefined ? limpiarTexto(custodioData.departamento) : data[i][4]);
        sheet.getRange(fila, 6).setValue(custodioData.ubicacion !== undefined ? limpiarTexto(custodioData.ubicacion) : data[i][5]);
        sheet.getRange(fila, 7).setValue(custodioData.estado ? String(custodioData.estado).toUpperCase() : data[i][6]);

        // Si el nombre del custodio cambió, actualizar en cascada en BIENES
        if (nombreViejo !== nuevoNombre) {
          actualizarNombreCustodioEnBienes(nombreViejo, nuevoNombre);
        }

        registrarAuditoria(
          usuario.email,
          'MODIFICAR',
          'CUSTODIOS',
          custodioData.idCustodio,
          nombreViejo,
          nuevoNombre
        );

        return { success: true, message: 'Custodio actualizado exitosamente.' };
      }
    }

    return { success: false, message: 'Custodio no encontrado.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Actualiza en cascada el nombre del custodio en la hoja de bienes
 */
function actualizarNombreCustodioEnBienes(nombreViejo, nuevoNombre) {
  var ss = getDB();
  var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
  if (!sheet || sheet.getLastRow() <= 1) return;

  var data = sheet.getDataRange().getValues();
  var colCustodio = data[0].indexOf('CUSTODIO');
  if (colCustodio === -1) return;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colCustodio]).trim() === nombreViejo.trim()) {
      sheet.getRange(i + 1, colCustodio + 1).setValue(nuevoNombre.trim());
    }
  }
}

/**
 * Obtiene los bienes asignados a un custodio específico
 * @param {string} token 
 * @param {string} nombreCustodio 
 * @returns {Object}
 */
function obtenerBienesPorCustodio(token, nombreCustodio) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);

    var ss = getDB();
    var sheet = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
    if (!sheet) return { success: true, data: [] };

    var data = sheet.getDataRange().getValues();
    var items = sheetValuesToObjects(data);
    var buscado = String(nombreCustodio || '').trim().toLowerCase();

    var bienesCustodio = items.filter(function (b) {
      return String(b.CUSTODIO).trim().toLowerCase() === buscado;
    });

    return { success: true, custodio: nombreCustodio, data: bienesCustodio };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
/** Versión pública con bloqueo contra concurrencia */
function crearCustodio() { return ejecutarConBloqueo_(crearCustodio_, arguments); }

/** Versión pública con bloqueo contra concurrencia */
function actualizarCustodio() { return ejecutarConBloqueo_(actualizarCustodio_, arguments); }

/**
 * Elimina un custodio. Se bloquea si todavía tiene bienes activos a su cargo.
 */
function eliminarCustodio_(token, idCustodio) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR']);
    var ss = getDB();
    var sheet = ss.getSheetByName('CUSTODIOS');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idCustodio).trim()) {
        var nombre = String(data[i][2]).trim();

        var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
        if (sheetBienes && sheetBienes.getLastRow() > 1) {
          var bienes = sheetBienes.getDataRange().getValues();
          for (var b = 1; b < bienes.length; b++) {
            if (String(bienes[b][10]).trim() === nombre && String(bienes[b][9]).toUpperCase().trim() !== 'BAJA') {
              return { success: false, message: 'No se puede eliminar: el custodio tiene bienes activos asignados. Reasígnelos primero o márquelo como INACTIVO.' };
            }
          }
        }

        sheet.deleteRow(i + 1);
        registrarAuditoria(usuario.email, 'ELIMINAR', 'CUSTODIOS', idCustodio, nombre, 'Custodio eliminado');
        return { success: true, message: 'Custodio eliminado correctamente.' };
      }
    }
    return { success: false, message: 'Custodio no encontrado.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function eliminarCustodio() { return ejecutarConBloqueo_(eliminarCustodio_, arguments); }
