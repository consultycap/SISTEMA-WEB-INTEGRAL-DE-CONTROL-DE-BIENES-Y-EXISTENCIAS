/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Rondas.gs (Constatación física por rondas: lista de bienes por
 * custodio o ubicación, marcando cada uno como verificado / faltante)
 * ============================================================================
 */

var HEADERS_RONDAS = ['ID_RONDA', 'FECHA_INICIO', 'TIPO_FILTRO', 'VALOR_FILTRO', 'ESTADO', 'TOTAL',
  'VERIFICADOS', 'FALTANTES', 'CON_DIFERENCIA', 'CREADA_POR', 'FECHA_CIERRE', 'OBSERVACION'];
var HEADERS_RONDAS_DET = ['ID_RONDA', 'CODIGO_BIEN', 'BIEN', 'CUSTODIO', 'UBICACION', 'CONDICION_SISTEMA',
  'ESTADO_ITEM', 'CONDICION_FISICA', 'NOVEDAD', 'FECHA_VERIFICACION', 'USUARIO'];
var ROLES_RONDAS = ['ADMINISTRADOR', 'INVENTARIADOR'];

/** Obtiene la hoja, creándola con sus encabezados si todavía no existe */
function hojaRonda_(nombre, headers) {
  var ss = getDB();
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4C1D95').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function norm_(v) { return String(v === undefined || v === null ? '' : v).trim().toUpperCase(); }

/**
 * Lista de ubicaciones distintas registradas en los bienes (para crear rondas)
 */
function listarUbicaciones(token) {
  try {
    validarSesionYRol(token, ROLES_RONDAS);
    var sheet = getDB().getSheetByName('BIENES_MUEBLES_INMUEBLES');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };
    var data = sheet.getDataRange().getValues();
    var col = data[0].indexOf('UBICACION');
    var vistos = {}, lista = [];
    for (var i = 1; i < data.length; i++) {
      var u = String(data[i][col] || '').trim();
      if (u && !vistos[u.toUpperCase()]) { vistos[u.toUpperCase()] = true; lista.push(u); }
    }
    lista.sort();
    return { success: true, data: lista };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Lista las rondas con su avance (calculado desde el detalle)
 */
function listarRondas(token) {
  try {
    validarSesionYRol(token, ROLES_RONDAS);
    var sh = getDB().getSheetByName('RONDAS');
    if (!sh || sh.getLastRow() <= 1) return { success: true, data: [] };
    var rondas = sheetValuesToObjects(sh.getDataRange().getValues());

    var avance = {};
    var shDet = getDB().getSheetByName('RONDAS_DETALLE');
    if (shDet && shDet.getLastRow() > 1) {
      var det = shDet.getDataRange().getValues();
      for (var i = 1; i < det.length; i++) {
        var id = String(det[i][0]);
        if (!avance[id]) avance[id] = { total: 0, verificados: 0, faltantes: 0 };
        avance[id].total++;
        if (det[i][6] === 'VERIFICADO') avance[id].verificados++;
        if (det[i][6] === 'FALTANTE') avance[id].faltantes++;
      }
    }
    rondas.forEach(function (r) {
      var a = avance[String(r.ID_RONDA)] || { total: 0, verificados: 0, faltantes: 0 };
      r.total = a.total; r.verificados = a.verificados; r.faltantes = a.faltantes;
      r.pendientes = a.total - a.verificados - a.faltantes;
    });
    rondas.sort(function (a, b) { return String(b.ID_RONDA).localeCompare(String(a.ID_RONDA)); });
    return { success: true, data: rondas };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Crea una ronda con todos los bienes activos de un custodio o de una ubicación
 * @param {Object} datos - { tipo: 'CUSTODIO'|'UBICACION', valor }
 */
function crearRonda_(token, datos) {
  try {
    var usuario = validarSesionYRol(token, ROLES_RONDAS);
    datos = datos || {};
    var tipo = norm_(datos.tipo);
    var valor = String(datos.valor || '').trim();
    if (tipo !== 'CUSTODIO' && tipo !== 'UBICACION') return { success: false, message: 'Tipo de ronda inválido.' };
    if (!valor) return { success: false, message: 'Seleccione el custodio o la ubicación.' };

    var shRondas = hojaRonda_('RONDAS', HEADERS_RONDAS);
    var shDet = hojaRonda_('RONDAS_DETALLE', HEADERS_RONDAS_DET);

    // No permitir dos rondas abiertas para lo mismo
    if (shRondas.getLastRow() > 1) {
      var existentes = shRondas.getDataRange().getValues();
      for (var r = 1; r < existentes.length; r++) {
        if (norm_(existentes[r][4]) === 'ABIERTA' && norm_(existentes[r][2]) === tipo && norm_(existentes[r][3]) === norm_(valor)) {
          return { success: false, message: 'Ya existe una ronda abierta (' + existentes[r][0] + ') para ' + valor + '. Ábrala o ciérrela primero.' };
        }
      }
    }

    var shBienes = getDB().getSheetByName('BIENES_MUEBLES_INMUEBLES');
    var bienes = shBienes.getDataRange().getValues();
    var h = bienes[0];
    var c = {
      cod: h.indexOf('CODIGO_BIEN'), bien: h.indexOf('BIEN'), cond: h.indexOf('CONDICION'),
      cust: h.indexOf('CUSTODIO'), ubic: h.indexOf('UBICACION')
    };

    var id = siguienteId(shRondas, 1, 'RON', 4);
    var fecha = getFechaHoraActual();
    var filas = [];
    for (var i = 1; i < bienes.length; i++) {
      if (norm_(bienes[i][c.cond]) === 'BAJA') continue;
      var coincide = tipo === 'CUSTODIO' ? norm_(bienes[i][c.cust]) === norm_(valor) : norm_(bienes[i][c.ubic]) === norm_(valor);
      if (!coincide) continue;
      filas.push([id, bienes[i][c.cod], bienes[i][c.bien], bienes[i][c.cust], bienes[i][c.ubic], bienes[i][c.cond],
        'PENDIENTE', '', '', '', '']);
    }
    if (!filas.length) return { success: false, message: 'No hay bienes activos para ese ' + tipo.toLowerCase() + '.' };

    shDet.getRange(shDet.getLastRow() + 1, 1, filas.length, HEADERS_RONDAS_DET.length).setValues(filas.map(function (f) { return f.map(limpiarTexto); }));
    shRondas.appendRow([id, fecha, tipo, limpiarTexto(valor), 'ABIERTA', filas.length, 0, 0, 0, usuario.email, '', '']);

    registrarAuditoria(usuario.email, 'CREAR', 'RONDAS', id, '', { tipo: tipo, valor: valor, bienes: filas.length });
    return { success: true, message: 'Ronda ' + id + ' creada con ' + filas.length + ' bienes.', idRonda: id };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function crearRonda() { return ejecutarConBloqueo_(crearRonda_, arguments); }

/**
 * Devuelve una ronda con todos sus bienes
 */
function obtenerRonda(token, idRonda) {
  try {
    validarSesionYRol(token, ROLES_RONDAS);
    var shR = getDB().getSheetByName('RONDAS');
    var shD = getDB().getSheetByName('RONDAS_DETALLE');
    if (!shR || !shD) return { success: false, message: 'No existen rondas.' };

    var rondas = sheetValuesToObjects(shR.getDataRange().getValues());
    var ronda = null;
    for (var i = 0; i < rondas.length; i++) if (String(rondas[i].ID_RONDA) === String(idRonda)) { ronda = rondas[i]; break; }
    if (!ronda) return { success: false, message: 'Ronda no encontrada.' };

    var items = sheetValuesToObjects(shD.getDataRange().getValues()).filter(function (x) {
      return String(x.ID_RONDA) === String(idRonda);
    });
    return { success: true, ronda: ronda, items: items };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Marca un bien de la ronda
 * @param {Object} d - { idRonda, codigoBien, estado: VERIFICADO|FALTANTE|PENDIENTE,
 *                       condicionFisica, novedad, actualizarCondicion }
 */
function marcarItemRonda_(token, d) {
  try {
    var usuario = validarSesionYRol(token, ROLES_RONDAS);
    d = d || {};
    var estado = norm_(d.estado);
    if (['VERIFICADO', 'FALTANTE', 'PENDIENTE'].indexOf(estado) === -1) return { success: false, message: 'Estado inválido.' };

    var shR = getDB().getSheetByName('RONDAS');
    var shD = getDB().getSheetByName('RONDAS_DETALLE');
    if (!shR || !shD) return { success: false, message: 'No existen rondas.' };

    var rondas = shR.getDataRange().getValues();
    var ronda = null;
    for (var i = 1; i < rondas.length; i++) if (String(rondas[i][0]) === String(d.idRonda)) { ronda = rondas[i]; break; }
    if (!ronda) return { success: false, message: 'Ronda no encontrada.' };
    if (norm_(ronda[4]) !== 'ABIERTA') return { success: false, message: 'La ronda ya está cerrada.' };

    var det = shD.getDataRange().getValues();
    var fila = -1;
    var codigo = norm_(d.codigoBien);
    for (var j = 1; j < det.length; j++) {
      if (String(det[j][0]) === String(d.idRonda) && norm_(det[j][1]) === codigo) { fila = j + 1; break; }
    }
    if (fila === -1) return { success: false, message: 'El bien ' + codigo + ' no pertenece a esta ronda.' };

    var condSistema = det[fila - 1][5];
    var condFisica = '';
    var novedad = String(d.novedad || '').trim();
    var fecha = getFechaHoraActual();

    if (estado === 'VERIFICADO') {
      condFisica = d.condicionFisica ? norm_(d.condicionFisica) : norm_(condSistema);
      var reg = registrarConstatacionBien_(token, {
        codigoBien: codigo,
        condicionFisica: condFisica,
        novedad: novedad || ('Verificado en ronda ' + d.idRonda),
        actualizarCondicionEnBien: !!d.actualizarCondicion
      });
      if (!reg || !reg.success) return { success: false, message: (reg && reg.message) || 'No se pudo registrar la constatación.' };
    }

    if (estado === 'PENDIENTE') {
      shD.getRange(fila, 7, 1, 5).setValues([['PENDIENTE', '', '', '', '']]);
    } else {
      shD.getRange(fila, 7, 1, 5).setValues([[estado, condFisica, limpiarTexto(novedad), fecha, usuario.email]]);
    }

    registrarAuditoria(usuario.email, 'RONDA_' + estado, 'RONDAS', d.idRonda + ' / ' + codigo,
      { estado: det[fila - 1][6] }, { estado: estado, condicionFisica: condFisica });

    return { success: true, message: 'Bien ' + codigo + ' marcado como ' + estado.toLowerCase() + '.', estado: estado };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function marcarItemRonda() { return ejecutarConBloqueo_(marcarItemRonda_, arguments); }

/**
 * Cierra la ronda. Si quedan bienes pendientes exige confirmación (forzar = true).
 */
function cerrarRonda_(token, idRonda, observacion, forzar) {
  try {
    var usuario = validarSesionYRol(token, ROLES_RONDAS);
    var shR = getDB().getSheetByName('RONDAS');
    var shD = getDB().getSheetByName('RONDAS_DETALLE');
    var rondas = shR.getDataRange().getValues();
    var fila = -1;
    for (var i = 1; i < rondas.length; i++) if (String(rondas[i][0]) === String(idRonda)) { fila = i + 1; break; }
    if (fila === -1) return { success: false, message: 'Ronda no encontrada.' };
    if (norm_(rondas[fila - 1][4]) !== 'ABIERTA') return { success: false, message: 'La ronda ya estaba cerrada.' };

    var det = shD.getDataRange().getValues();
    var total = 0, verif = 0, falt = 0, dif = 0;
    for (var j = 1; j < det.length; j++) {
      if (String(det[j][0]) !== String(idRonda)) continue;
      total++;
      if (det[j][6] === 'VERIFICADO') {
        verif++;
        if (norm_(det[j][5]) !== norm_(det[j][7])) dif++;
      }
      if (det[j][6] === 'FALTANTE') falt++;
    }
    var pendientes = total - verif - falt;
    if (pendientes > 0 && !forzar) {
      return { success: false, codigo: 'PENDIENTES', pendientes: pendientes,
        message: 'Quedan ' + pendientes + ' bienes sin verificar. ¿Desea cerrar la ronda de todas formas?' };
    }

    shR.getRange(fila, 5, 1, 5).setValues([['CERRADA', total, verif, falt, dif]]);
    shR.getRange(fila, 11, 1, 2).setValues([[getFechaHoraActual(), limpiarTexto(String(observacion || '').trim())]]);

    registrarAuditoria(usuario.email, 'CERRAR', 'RONDAS', idRonda, '',
      { total: total, verificados: verif, faltantes: falt, conDiferencia: dif, pendientes: pendientes });
    return { success: true, message: 'Ronda ' + idRonda + ' cerrada. Verificados: ' + verif + ', faltantes: ' + falt + ', pendientes: ' + pendientes + '.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function cerrarRonda() { return ejecutarConBloqueo_(cerrarRonda_, arguments); }
