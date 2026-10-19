/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN Y SESIONES
 * Archivo: Login.gs
 * ============================================================================
 */

var MAX_INTENTOS_LOGIN = 5;
var BLOQUEO_LOGIN_SEG = 900; // 15 minutos

/**
 * Autentica un usuario contra la hoja USUARIOS.
 * Ya NO existe acceso por defecto ni credenciales fijas: si no hay usuarios,
 * ejecute "crearAdminInicial" desde el editor o el menú de la hoja.
 */
function iniciarSesion(email, password) {
  try {
    if (!email || !password) {
      return { success: false, message: 'Ingrese su correo electrónico y contraseña.' };
    }

    var emailClean = String(email).toLowerCase().trim();
    var cache = CacheService.getScriptCache();
    var claveIntentos = 'LF_' + emailClean;
    var intentos = parseInt(cache.get(claveIntentos) || '0', 10);

    if (intentos >= MAX_INTENTOS_LOGIN) {
      return { success: false, message: 'Demasiados intentos fallidos. Espere 15 minutos e intente nuevamente.' };
    }

    var ss = getDB();
    var sheet = ss.getSheetByName('USUARIOS');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: 'No hay usuarios registrados. Ejecute "Crear Usuario Administrador Inicial" desde la hoja de cálculo.' };
    }

    var data = sheet.getDataRange().getValues();
    var h = data[0];
    var col = {
      id: h.indexOf('ID_USUARIO'), nombre: h.indexOf('NOMBRE'), email: h.indexOf('EMAIL'),
      pass: h.indexOf('PASSWORD'), rol: h.indexOf('ROL'), estado: h.indexOf('ESTADO'),
      acceso: h.indexOf('ULTIMO_ACCESO')
    };
    if (col.email === -1 || col.pass === -1) {
      return { success: false, message: 'Estructura de la hoja USUARIOS inválida. Ejecute "Inicializar / Reparar Base de Datos".' };
    }

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][col.email]).toLowerCase().trim() !== emailClean) continue;

      var chequeo = verificarPassword(String(password).trim(), data[i][col.pass]);
      if (!chequeo.ok) break;

      var estado = col.estado !== -1 ? String(data[i][col.estado]).toUpperCase().trim() : 'ACTIVO';
      if (estado !== 'ACTIVO') {
        return { success: false, message: 'Su usuario se encuentra inactivo. Contacte al administrador.' };
      }

      // Migración automática de contraseñas antiguas en texto plano
      if (chequeo.legacy) {
        sheet.getRange(i + 1, col.pass + 1).setValue(hashPassword(String(password).trim()));
      }
      if (col.acceso !== -1) {
        sheet.getRange(i + 1, col.acceso + 1).setValue(getFechaHoraActual());
      }

      var usuarioValido = {
        id: col.id !== -1 ? data[i][col.id] : 'USR-' + i,
        nombre: col.nombre !== -1 ? data[i][col.nombre] : emailClean,
        email: emailClean,
        rol: col.rol !== -1 ? String(data[i][col.rol]).toUpperCase().trim() : 'CONSULTA',
        iat: new Date().getTime()
      };

      var token = 'TK-' + Utilities.getUuid();
      cache.put(token, JSON.stringify(usuarioValido), CONFIG.SESSION_EXPIRATION_HOURS * 3600);
      cache.remove(claveIntentos);

      registrarAuditoria(emailClean, 'LOGIN', 'SEGURIDAD', emailClean, '', 'Inicio de sesión');
      return { success: true, token: token, usuario: usuarioValido };
    }

    cache.put(claveIntentos, String(intentos + 1), BLOQUEO_LOGIN_SEG);
    return { success: false, message: 'Credenciales inválidas. Verifique su correo y contraseña.' };

  } catch (err) {
    return { success: false, message: 'Error en el servidor: ' + err.message };
  }
}

/**
 * Cierra la sesión
 */
function cerrarSesion(token) {
  if (token) {
    try { CacheService.getScriptCache().remove(token); } catch (e) { }
  }
  return { success: true, message: 'Sesión cerrada exitosamente.' };
}

/**
 * Verifica el token. Devuelve el usuario o null.
 * Invalida tokens emitidos antes de un cambio de rol/estado/clave del usuario.
 */
function verificarTokenSesion(token) {
  if (!token) return null;
  try {
    var cache = CacheService.getScriptCache();
    var userStr = cache.get(token);
    if (!userStr) return null;

    var usuario = JSON.parse(userStr);
    var revocadoEn = cache.get('INV_' + String(usuario.email).toLowerCase());
    if (revocadoEn && usuario.iat && usuario.iat < parseInt(revocadoEn, 10)) {
      cache.remove(token);
      return null;
    }
    return usuario;
  } catch (e) {
    // Si CacheService falla, por seguridad se deniega el acceso
    return null;
  }
}

/**
 * Endpoint público: el frontend lo usa al recargar la página para saber
 * si el token guardado sigue siendo válido.
 */
function validarSesion(token) {
  var usuario = verificarTokenSesion(token);
  if (!usuario) return { success: false, message: 'Sesión inválida o expirada.' };
  return { success: true, usuario: usuario };
}

/**
 * Fuerza el cierre de todas las sesiones activas de un usuario
 * (se llama al cambiar su rol, estado o contraseña, o al eliminarlo).
 */
function invalidarSesionesUsuario_(email) {
  try {
    CacheService.getScriptCache().put(
      'INV_' + String(email).toLowerCase().trim(),
      String(new Date().getTime()),
      CONFIG.SESSION_EXPIRATION_HOURS * 3600
    );
  } catch (e) { }
}

/**
 * Permite a cualquier usuario autenticado cambiar su propia contraseña.
 * Al terminar se cierran todas sus sesiones (debe iniciar sesión de nuevo).
 */
function cambiarMiPassword(token, actual, nueva) {
  try {
    var usuario = validarSesionYRol(token, ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA']);
    if (!actual || !nueva) return { success: false, message: 'Complete todos los campos.' };

    var cache = CacheService.getScriptCache();
    var claveIntentos = 'LF_' + String(usuario.email).toLowerCase();
    var intentos = parseInt(cache.get(claveIntentos) || '0', 10);
    if (intentos >= MAX_INTENTOS_LOGIN) {
      return { success: false, message: 'Demasiados intentos fallidos. Espere 15 minutos.' };
    }

    var errPass = validarPoliticaPassword_(nueva);
    if (errPass) return { success: false, message: errPass };
    if (String(actual) === String(nueva)) {
      return { success: false, message: 'La nueva contraseña debe ser distinta a la actual.' };
    }

    return conBloqueo(function () {
      var sheet = getDB().getSheetByName('USUARIOS');
      var data = sheet.getDataRange().getValues();
      var h = data[0];
      var colEmail = h.indexOf('EMAIL');
      var colPass = h.indexOf('PASSWORD');

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colEmail]).toLowerCase().trim() !== String(usuario.email).toLowerCase()) continue;

        var chequeo = verificarPassword(String(actual), data[i][colPass]);
        if (!chequeo.ok) {
          cache.put(claveIntentos, String(intentos + 1), BLOQUEO_LOGIN_SEG);
          return { success: false, message: 'La contraseña actual es incorrecta.' };
        }

        sheet.getRange(i + 1, colPass + 1).setValue(hashPassword(String(nueva)));
        invalidarSesionesUsuario_(usuario.email);
        registrarAuditoria(usuario.email, 'MODIFICAR', 'SEGURIDAD', usuario.email, '', 'Cambio de contraseña propia');
        return { success: true, message: 'Contraseña actualizada. Inicie sesión nuevamente.' };
      }
      return { success: false, message: 'Usuario no encontrado.' };
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}
