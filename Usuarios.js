/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: Usuarios.gs (Gestión de Usuarios y Roles Institucionales)
 * ============================================================================
 */

var ROLES_VALIDOS = ['ADMINISTRADOR', 'INVENTARIADOR', 'CONSULTA'];
var ESTADOS_USUARIO = ['ACTIVO', 'INACTIVO'];

/**
 * Lista de usuarios (solo ADMINISTRADOR). Nunca devuelve el hash de contraseña.
 */
function listarUsuarios(token) {
  try {
    validarSesionYRol(token, ['ADMINISTRADOR']);

    var sheet = getDB().getSheetByName('USUARIOS');
    if (!sheet) return { success: false, message: 'Hoja USUARIOS no existe.' };

    var items = sheetValuesToObjects(sheet.getDataRange().getValues());
    var sanitizados = items.map(function (u) {
      return {
        id: u.ID_USUARIO,
        nombre: u.NOMBRE,
        email: u.EMAIL,
        rol: u.ROL,
        estado: u.ESTADO,
        fechaCreacion: u.FECHA_CREACION,
        ultimoAcceso: u.ULTIMO_ACCESO
      };
    });

    return { success: true, data: sanitizados };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function crearUsuario() { return ejecutarConBloqueo_(crearUsuario_, arguments); }

function crearUsuario_(token, usuarioData) {
  var admin = validarSesionYRol(token, ['ADMINISTRADOR']);

  if (!usuarioData || !usuarioData.nombre || !usuarioData.email || !usuarioData.password || !usuarioData.rol) {
    return { success: false, message: 'Todos los campos obligatorios deben ser completados.' };
  }

  var email = String(usuarioData.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'El correo electrónico no tiene un formato válido.' };
  }

  var rol = String(usuarioData.rol).toUpperCase().trim();
  if (ROLES_VALIDOS.indexOf(rol) === -1) {
    return { success: false, message: 'Rol inválido. Debe ser ADMINISTRADOR, INVENTARIADOR o CONSULTA.' };
  }

  var errPass = validarPoliticaPassword_(usuarioData.password);
  if (errPass) return { success: false, message: errPass };

  var estado = usuarioData.estado ? String(usuarioData.estado).toUpperCase().trim() : 'ACTIVO';
  if (ESTADOS_USUARIO.indexOf(estado) === -1) estado = 'ACTIVO';

  var sheet = getDB().getSheetByName('USUARIOS');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase().trim() === email) {
      return { success: false, message: 'El correo electrónico ya se encuentra registrado.' };
    }
  }

  var nuevoId = siguienteId(sheet, 1, 'USR', 4);

  sheet.appendRow([
    nuevoId,
    limpiarTexto(String(usuarioData.nombre)),
    email,
    hashPassword(usuarioData.password),
    rol,
    estado,
    getFechaHoraActual(),
    ''
  ]);

  registrarAuditoria(admin.email, 'CREAR', 'USUARIOS', nuevoId, '', 'Usuario creado: ' + email + ' (' + rol + ')');
  return { success: true, message: 'Usuario ' + email + ' creado correctamente.' };
}

function actualizarUsuario() { return ejecutarConBloqueo_(actualizarUsuario_, arguments); }

function actualizarUsuario_(token, usuarioData) {
  var admin = validarSesionYRol(token, ['ADMINISTRADOR']);

  if (!usuarioData || !usuarioData.id) {
    return { success: false, message: 'ID de usuario no especificado.' };
  }

  var sheet = getDB().getSheetByName('USUARIOS');
  var data = sheet.getDataRange().getValues();

  var rowIndex = -1;
  var prev = null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(usuarioData.id).trim()) {
      rowIndex = i + 1;
      prev = { nombre: data[i][1], email: String(data[i][2]).toLowerCase().trim(), rol: data[i][4], estado: data[i][5] };
      break;
    }
  }
  if (rowIndex === -1) return { success: false, message: 'Usuario no encontrado.' };

  var esMismoUsuario = prev.email === String(admin.email).toLowerCase();

  var nuevoEmail = usuarioData.email ? String(usuarioData.email).trim().toLowerCase() : prev.email;
  if (nuevoEmail !== prev.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoEmail)) {
      return { success: false, message: 'El correo electrónico no tiene un formato válido.' };
    }
    for (var j = 1; j < data.length; j++) {
      if (j + 1 !== rowIndex && String(data[j][2]).toLowerCase().trim() === nuevoEmail) {
        return { success: false, message: 'Ese correo ya pertenece a otro usuario.' };
      }
    }
  }

  var nuevoRol = usuarioData.rol ? String(usuarioData.rol).toUpperCase().trim() : String(prev.rol).toUpperCase();
  if (ROLES_VALIDOS.indexOf(nuevoRol) === -1) {
    return { success: false, message: 'Rol inválido.' };
  }
  var nuevoEstado = usuarioData.estado ? String(usuarioData.estado).toUpperCase().trim() : String(prev.estado).toUpperCase();
  if (ESTADOS_USUARIO.indexOf(nuevoEstado) === -1) {
    return { success: false, message: 'Estado inválido.' };
  }

  // Protecciones: no quitarse el acceso a uno mismo ni dejar el sistema sin administradores activos
  if (esMismoUsuario && (nuevoRol !== 'ADMINISTRADOR' || nuevoEstado !== 'ACTIVO')) {
    return { success: false, message: 'No puede quitarse a sí mismo el rol de administrador ni desactivar su propia cuenta.' };
  }
  var eraAdminActivo = String(prev.rol).toUpperCase() === 'ADMINISTRADOR' && String(prev.estado).toUpperCase() === 'ACTIVO';
  var seguiraAdminActivo = nuevoRol === 'ADMINISTRADOR' && nuevoEstado === 'ACTIVO';
  if (eraAdminActivo && !seguiraAdminActivo && contarAdministradoresActivos_(data) <= 1) {
    return { success: false, message: 'Debe existir al menos un administrador activo.' };
  }

  var cambiaClave = !!(usuarioData.password && String(usuarioData.password).trim() !== '');
  if (cambiaClave) {
    var errPass = validarPoliticaPassword_(usuarioData.password);
    if (errPass) return { success: false, message: errPass };
  }

  if (usuarioData.nombre) sheet.getRange(rowIndex, 2).setValue(limpiarTexto(String(usuarioData.nombre)));
  sheet.getRange(rowIndex, 3).setValue(nuevoEmail);
  if (cambiaClave) sheet.getRange(rowIndex, 4).setValue(hashPassword(usuarioData.password));
  sheet.getRange(rowIndex, 5).setValue(nuevoRol);
  sheet.getRange(rowIndex, 6).setValue(nuevoEstado);

  // Si cambió algo sensible, cerrar sus sesiones activas
  if (cambiaClave || nuevoRol !== String(prev.rol).toUpperCase() || nuevoEstado !== String(prev.estado).toUpperCase() || nuevoEmail !== prev.email) {
    invalidarSesionesUsuario_(prev.email);
    if (nuevoEmail !== prev.email) invalidarSesionesUsuario_(nuevoEmail);
  }

  registrarAuditoria(
    admin.email, 'MODIFICAR', 'USUARIOS', usuarioData.id,
    prev,
    { nombre: usuarioData.nombre || prev.nombre, email: nuevoEmail, rol: nuevoRol, estado: nuevoEstado, claveCambiada: cambiaClave }
  );

  return { success: true, message: 'Usuario actualizado exitosamente.' };
}

function eliminarUsuario() { return ejecutarConBloqueo_(eliminarUsuario_, arguments); }

function eliminarUsuario_(token, idUsuario) {
  var admin = validarSesionYRol(token, ['ADMINISTRADOR']);

  var sheet = getDB().getSheetByName('USUARIOS');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(idUsuario).trim()) {
      var emailBorrado = String(data[i][2]).toLowerCase().trim();

      if (emailBorrado === String(admin.email).toLowerCase()) {
        return { success: false, message: 'No puede eliminar su propia cuenta de administrador en uso.' };
      }
      var eraAdminActivo = String(data[i][4]).toUpperCase() === 'ADMINISTRADOR' && String(data[i][5]).toUpperCase() === 'ACTIVO';
      if (eraAdminActivo && contarAdministradoresActivos_(data) <= 1) {
        return { success: false, message: 'Debe existir al menos un administrador activo.' };
      }

      sheet.deleteRow(i + 1);
      invalidarSesionesUsuario_(emailBorrado);

      registrarAuditoria(admin.email, 'ELIMINAR', 'USUARIOS', idUsuario, emailBorrado, 'Usuario eliminado del sistema');
      return { success: true, message: 'Usuario eliminado satisfactoriamente.' };
    }
  }

  return { success: false, message: 'Usuario no encontrado para eliminar.' };
}

function contarAdministradoresActivos_(data) {
  var n = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][4]).toUpperCase() === 'ADMINISTRADOR' && String(data[i][5]).toUpperCase() === 'ACTIVO') n++;
  }
  return n;
}
