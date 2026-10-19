/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Fotos.gs (Fotografías de los bienes, guardadas en Google Drive)
 * ============================================================================
 * Las fotos se guardan en una carpeta privada de Drive del propietario del
 * sistema. Nunca se comparten por enlace: la aplicación las entrega a los
 * usuarios autenticados ya convertidas a imagen.
 */

var FOTOS_MAX_BYTES = 2 * 1024 * 1024; // 2 MB por foto (el navegador ya las comprime)

function carpetaFotos_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOTOS_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se vuelve a crear */ }
  }
  var carpeta = DriveApp.createFolder('SISTEMA_BIENES_FOTOS');
  props.setProperty('FOTOS_FOLDER_ID', carpeta.getId());
  return carpeta;
}

/** Busca el bien y devuelve { sheet, fila, colFoto, fotoId } o un mensaje de error */
function ubicarBienFoto_(codigoBien) {
  var sheet = getDB().getSheetByName('BIENES_MUEBLES_INMUEBLES');
  var data = sheet.getDataRange().getValues();
  var colFoto = data[0].indexOf('FOTO_ID');
  if (colFoto === -1) {
    return { error: 'Falta la columna FOTO_ID. Ejecute "Inicializar / Reparar Base de Datos" desde el menú de la hoja.' };
  }
  var cod = norm_(codigoBien);
  for (var i = 1; i < data.length; i++) {
    if (norm_(data[i][0]) === cod) {
      return { sheet: sheet, fila: i + 1, colFoto: colFoto + 1, fotoId: String(data[i][colFoto] || '') };
    }
  }
  return { error: 'Bien ' + cod + ' no encontrado.' };
}

function subirFotoBien_(token, codigoBien, dataUrl) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);
    var m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=\s]+)$/.exec(String(dataUrl || ''));
    if (!m) return { success: false, message: 'Formato de imagen no válido (use JPG, PNG o WEBP).' };

    var bytes = Utilities.base64Decode(m[2].replace(/\s/g, ''));
    if (bytes.length > FOTOS_MAX_BYTES) return { success: false, message: 'La foto es demasiado grande (máximo 2 MB).' };

    var ub = ubicarBienFoto_(codigoBien);
    if (ub.error) return { success: false, message: ub.error };

    // Reemplazar la foto anterior
    if (ub.fotoId) {
      try { DriveApp.getFileById(ub.fotoId).setTrashed(true); } catch (e) { }
    }

    var ext = m[1] === 'image/png' ? 'png' : (m[1] === 'image/webp' ? 'webp' : 'jpg');
    var blob = Utilities.newBlob(bytes, m[1], norm_(codigoBien) + '.' + ext);
    var archivo = carpetaFotos_().createFile(blob);
    ub.sheet.getRange(ub.fila, ub.colFoto).setValue(archivo.getId());

    registrarAuditoria(usuario.email, 'MODIFICAR', 'BIENES', norm_(codigoBien), '', 'Foto del bien actualizada');
    return { success: true, message: 'Foto guardada.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function subirFotoBien() { return ejecutarConBloqueo_(subirFotoBien_, arguments); }

function eliminarFotoBien_(token, codigoBien) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR']);
    var ub = ubicarBienFoto_(codigoBien);
    if (ub.error) return { success: false, message: ub.error };
    if (ub.fotoId) {
      try { DriveApp.getFileById(ub.fotoId).setTrashed(true); } catch (e) { }
    }
    ub.sheet.getRange(ub.fila, ub.colFoto).setValue('');
    registrarAuditoria(usuario.email, 'MODIFICAR', 'BIENES', norm_(codigoBien), '', 'Foto del bien eliminada');
    return { success: true, message: 'Foto eliminada.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
function eliminarFotoBien() { return ejecutarConBloqueo_(eliminarFotoBien_, arguments); }

/**
 * Devuelve la foto como imagen en base64 (o null si el bien no tiene foto)
 */
function obtenerFotoBien(token, codigoBien) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);
    var ub = ubicarBienFoto_(codigoBien);
    if (ub.error || !ub.fotoId) return { success: true, data: null };
    try {
      var blob = DriveApp.getFileById(ub.fotoId).getBlob();
      return { success: true, data: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
    } catch (e) {
      return { success: true, data: null };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}
