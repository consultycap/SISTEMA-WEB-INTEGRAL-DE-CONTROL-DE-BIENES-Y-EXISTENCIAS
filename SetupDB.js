/**
 * ============================================================================
 * SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
 * Archivo: SetupDB.gs (Inicializador Automático de la Base de Datos)
 * ============================================================================
 * Ejecute la función "inicializarBaseDatos()" desde el editor de Google Apps Script
 * o desde el menú de la hoja de cálculo para crear automáticamente las 8 hojas
 * con sus encabezados oficiales, estilos visuales y datos iniciales de prueba.
 */

/**
 * Menú personalizado en Google Sheets al abrir la hoja
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏢 Sistema Inventario')
    .addItem('🚀 Inicializar / Reparar Base de Datos', 'inicializarBaseDatos')
    .addItem('👤 Crear Usuario Administrador Inicial', 'crearAdminInicial')
    .addItem('🧪 Cargar Datos de Demostración', 'cargarDatosDemo')
    .addItem('🔑 Autorizar permisos (Drive y correo)', 'autorizarPermisos')
    .addSeparator()
    .addItem('🌐 Obtener URL de la Web App', 'mostrarUrlWebApp')
    .addToUi();
}

/**
 * Función principal para crear o estructurar todas las hojas requeridas
 */
function inicializarBaseDatos() {
  var ss = getDB();
  var hojasDefinicion = [
    {
      nombre: 'USUARIOS',
      color: '#1E3A8A',
      encabezados: [
        'ID_USUARIO', 'NOMBRE', 'EMAIL', 'PASSWORD', 'ROL', 'ESTADO', 'FECHA_CREACION', 'ULTIMO_ACCESO'
      ]
    },
    {
      nombre: 'BIENES_MUEBLES_INMUEBLES',
      color: '#065F46',
      encabezados: [
        'CODIGO_BIEN', 'TIPO_BIEN', 'BIEN', 'SERIE', 'MODELO', 'MARCA', 'COLOR',
        'MATERIAL', 'DIMENSION', 'CONDICION', 'CUSTODIO', 'DESCRIPCION_BIEN',
        'CUENTA_CONTABLE', 'VIDA_UTIL', 'VALOR_CONTABLE', 'OBSERVACION', 'UBICACION',
        'FECHA_REGISTRO', 'USUARIO_REGISTRO', 'FOTO_ID', 'FECHA_ADQUISICION'
      ]
    },
    {
      nombre: 'CUSTODIOS',
      color: '#1E40AF',
      encabezados: [
        'ID_CUSTODIO', 'CEDULA', 'NOMBRE', 'CARGO', 'DEPARTAMENTO', 'UBICACION', 'ESTADO'
      ]
    },
    {
      nombre: 'EXISTENCIAS',
      color: '#92400E',
      encabezados: [
        'ID_EXISTENCIA', 'CUENTA_CONTABLE', 'CODIGO', 'DESCRIPCION', 'CANTIDAD', 'ESTADO', 'OBSERVACION', 'STOCK_MINIMO'
      ]
    },
    {
      nombre: 'MOVIMIENTOS_EXISTENCIAS',
      color: '#7C2D12',
      encabezados: [
        'ID_MOVIMIENTO', 'FECHA', 'TIPO_MOVIMIENTO', 'CODIGO', 'DESCRIPCION',
        'CUENTA_CONTABLE', 'INGRESO', 'SALIDA', 'SALDO', 'RESPONSABLE', 'OBSERVACION', 'USUARIO_REGISTRO'
      ]
    },
    {
      nombre: 'CONSTACION_BIENES',
      color: '#4C1D95',
      encabezados: [
        'ID_CONSTATACION', 'FECHA', 'CODIGO_BIEN', 'BIEN', 'CUSTODIO',
        'UBICACION', 'CONDICION_SISTEMA', 'CONDICION_FISICA', 'NOVEDAD', 'USUARIO'
      ]
    },
    {
      nombre: 'CONSTACION_EXISTENCIAS',
      color: '#831843',
      encabezados: [
        'ID_CONSTATACION', 'FECHA', 'CODIGO', 'DESCRIPCION', 'STOCK_SISTEMA',
        'STOCK_FISICO', 'DIFERENCIA', 'ESTADO', 'OBSERVACION', 'USUARIO'
      ]
    },
    {
      nombre: 'RONDAS',
      color: '#4C1D95',
      encabezados: HEADERS_RONDAS
    },
    {
      nombre: 'RONDAS_DETALLE',
      color: '#5B21B6',
      encabezados: HEADERS_RONDAS_DET
    },
    {
      nombre: 'AUDITORIA',
      color: '#1F2937',
      encabezados: [
        'FECHA', 'USUARIO', 'ACCION', 'MODULO', 'REGISTRO_AFECTADO', 'VALOR_ANTERIOR', 'VALOR_NUEVO'
      ]
    }
  ];

  hojasDefinicion.forEach(function (def) {
    var sheet = ss.getSheetByName(def.nombre);
    if (!sheet) {
      sheet = ss.insertSheet(def.nombre);
    }

    // Configurar encabezados si está vacía
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(def.encabezados);
    } else {
      // Si ya tiene datos, asegurar que la fila 1 coincida
      var currentHeaders = sheet.getRange(1, 1, 1, def.encabezados.length).getValues()[0];
      var headersMatch = def.encabezados.every(function (h, idx) {
        return currentHeaders[idx] === h;
      });
      if (!headersMatch) {
        sheet.getRange(1, 1, 1, def.encabezados.length).setValues([def.encabezados]);
      }
    }

    // Aplicar estilos profesionales a la fila de encabezados
    var headerRange = sheet.getRange(1, 1, 1, def.encabezados.length);
    headerRange.setBackground(def.color)
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setFontFamily('Segoe UI')
      .setFontSize(10)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true);

    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);

    // Columnas de texto: evitan que Sheets quite ceros iniciales (cédulas que empiezan en 0,
    // como las de Guayas) o convierta series/códigos en números o fechas
    var colsTexto = { 'CUSTODIOS': [2], 'BIENES_MUEBLES_INMUEBLES': [1, 4, 21], 'EXISTENCIAS': [1, 3], 'USUARIOS': [4] };
    (colsTexto[def.nombre] || []).forEach(function (c) {
      sheet.getRange(2, c, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });

    // Ajustar anchos automáticos
    for (var c = 1; c <= def.encabezados.length; c++) {
      sheet.autoResizeColumn(c);
      if (sheet.getColumnWidth(c) < 110) {
        sheet.setColumnWidth(c, 120);
      }
    }
  });

  // Eliminar la "Hoja 1" o "Sheet1" por defecto si existen las demás
  var defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) { }
  }

  // Poblar datos de prueba iniciales si la hoja de usuarios está vacía
  poblarDatosIniciales();

  return {
    success: true,
    message: 'Base de datos inicializada correctamente con las hojas institucionales.'
  };
}

/**
 * Inserta usuario administrador y datos de demostración
 */
function poblarDatosIniciales() {
  var ss = getDB();
  var sheetUsuarios = ss.getSheetByName('USUARIOS');

  // Solo se crea el administrador (con contraseña aleatoria). Los datos de ejemplo
  // ya no se cargan automáticamente: use "Cargar Datos de Demostración" si los necesita.
  if (sheetUsuarios.getLastRow() <= 1) {
    crearAdminInicial();
  }
}

/**
 * Carga datos de ejemplo (custodios, bienes, existencias y kardex). Solo para pruebas.
 */
function cargarDatosDemo() {
  var ss = getDB();

  // Custodios iniciales
  var sheetCustodios = ss.getSheetByName('CUSTODIOS');
  if (sheetCustodios.getLastRow() <= 1) {
    var custodiosInit = [
      ['CUST-001', '1718293041', 'Ing. Roberto Andrade', 'Director de Tecnologías (TIC)', 'Dirección de Tecnología', 'Edificio Central - Piso 3', 'ACTIVO'],
      ['CUST-002', '1723456789', 'Lic. María Elena Torres', 'Jefa de Talento Humano', 'Talento Humano', 'Edificio Central - Piso 2', 'ACTIVO'],
      ['CUST-003', '1798765432', 'Econ. Juan Carlos Paz', 'Director Financiero', 'Dirección Financiera', 'Edificio Central - Piso 1', 'ACTIVO'],
      ['CUST-004', '1755443322', 'Dra. Andrea Salazar', 'Coordinadora de Asesoría Jurídica', 'Asesoría Jurídica', 'Edificio Anexo - Piso 2', 'ACTIVO']
    ];
    sheetCustodios.getRange(2, 1, custodiosInit.length, custodiosInit[0].length).setValues(custodiosInit);
  }

  // Bienes iniciales (BLD y BCA)
  var sheetBienes = ss.getSheetByName('BIENES_MUEBLES_INMUEBLES');
  if (sheetBienes.getLastRow() <= 1) {
    var fecha = getFechaHoraActual();
    var bienesInit = [
      [
        'BLD-00001', 'BLD', 'Computador Portátil Dell Latitude 5430', 'DL-99283-X', 'Latitude 5430', 'Dell',
        'Gris', 'Aluminio / Polímero', '14 pulgadas', 'BUENO', 'Ing. Roberto Andrade',
        'Laptop Core i7 12th Gen, 16GB RAM, 512GB SSD para desarrollo institucional',
        '141.01.07 Equipos de Computación', 5, 850.00, 'Entregado con cargador y maletín original',
        'Edificio Central - Piso 3', fecha, 'admin@institucion.gob.ec'
      ],
      [
        'BLD-00002', 'BLD', 'Servidor Rack HPE ProLiant DL380 Gen10', 'HPE-88472-R', 'DL380 Gen10', 'HPE',
        'Negro / Metálico', 'Acero', '2U Rack', 'BUENO', 'Ing. Roberto Andrade',
        'Servidor institucional de base de datos y virtualización',
        '141.01.07 Equipos de Computación', 7, 4200.00, 'Instalado en Rack Principal Data Center',
        'Data Center - Piso 3', fecha, 'admin@institucion.gob.ec'
      ],
      [
        'BLD-00003', 'BLD', 'Impresora Multifunción Láser Canon ImageRunner', 'CN-55120-M', 'iR-ADV 4545', 'Canon',
        'Blanco', 'Plástico / Metal', '60x65x110 cm', 'REGULAR', 'Lic. María Elena Torres',
        'Multifunción monocromática de alto volumen',
        '141.01.07 Equipos de Computación', 5, 1350.00, 'Requiere mantenimiento preventivo de rodillos',
        'Edificio Central - Piso 2', fecha, 'admin@institucion.gob.ec'
      ],
      [
        'BCA-00001', 'BCA', 'Silla Ergonómica Giratoria de Oficina', 'S/N-001', 'ErgoPro 500', 'Interstuhl',
        'Negro', 'Malla / Acero', '65x65x115 cm', 'BUENO', 'Econ. Juan Carlos Paz',
        'Silla ergonómica de control administrativo para puesto gerencial',
        '141.01.03 Mobiliarios de Oficina', 3, 145.00, 'Excelente estado',
        'Edificio Central - Piso 1', fecha, 'admin@institucion.gob.ec'
      ],
      [
        'BCA-00002', 'BCA', 'Escritorio Ejecutivo en L Melamínico', 'S/N-002', 'Exec L-180', 'Modumueble',
        'Caoba / Negro', 'Melamínico 25mm / Metal', '180x160x75 cm', 'BUENO', 'Dra. Andrea Salazar',
        'Escritorio con cajonera móvil de 3 gavetas con llave',
        '141.01.03 Mobiliarios de Oficina', 5, 290.00, 'Sin novedades',
        'Edificio Anexo - Piso 2', fecha, 'admin@institucion.gob.ec'
      ]
    ];
    sheetBienes.getRange(2, 1, bienesInit.length, bienesInit[0].length).setValues(bienesInit);
  }

  // Existencias iniciales
  var sheetExistencias = ss.getSheetByName('EXISTENCIAS');
  if (sheetExistencias.getLastRow() <= 1) {
    var existenciasInit = [
      ['SUM-001', '131.01.01 Suministros de Oficina', 'EX-0001', 'Papel Bond A4 75g (Resma 500 hojas)', 450, 'BUENO', 'Stock para impresiones institucionales', 15],
      ['SUM-002', '131.01.01 Suministros de Oficina', 'EX-0002', 'Tóner HP LaserJet Original 85A Negro', 18, 'BUENO', 'Para impresoras de talento humano y financiero', 15],
      ['SUM-003', '131.01.01 Suministros de Oficina', 'EX-0003', 'Bolígrafo Punta Fina Azul (Caja x 50)', 35, 'BUENO', 'Material consumible de escritorio', 15],
      ['SUM-004', '131.01.03 Materiales de Aseo y Limpieza', 'EX-0004', 'Alcohol Antiséptico 70% Galón 3.8L', 24, 'BUENO', 'Bodega de insumos de higiene', 15],
      ['SUM-005', '131.01.02 Repuestos y Accesorios de TIC', 'EX-0005', 'Cable Patch Cord UTP Cat 6 (3 metros)', 60, 'BUENO', 'Cables para puestos de red de datos', 15]
    ];
    sheetExistencias.getRange(2, 1, existenciasInit.length, existenciasInit[0].length).setValues(existenciasInit);
  }

  // Movimientos iniciales de Kardex
  var sheetMov = ss.getSheetByName('MOVIMIENTOS_EXISTENCIAS');
  if (sheetMov.getLastRow() <= 1) {
    var fecha = getFechaHoraActual();
    var movsInit = [
      ['MOV-0001', fecha, 'INGRESO POR COMPRA', 'EX-0001', 'Papel Bond A4 75g (Resma 500 hojas)', '131.01.01 Suministros de Oficina', 500, 0, 500, 'Proveedor Papelera Nacional', 'Factura 001-020-004928', 'admin@institucion.gob.ec'],
      ['MOV-0002', fecha, 'ENTREGA', 'EX-0001', 'Papel Bond A4 75g (Resma 500 hojas)', '131.01.01 Suministros de Oficina', 0, 50, 450, 'Talento Humano', 'Requerimiento Nro. TH-2026-015', 'admin@institucion.gob.ec'],
      ['MOV-0003', fecha, 'INGRESO POR COMPRA', 'EX-0002', 'Tóner HP LaserJet Original 85A Negro', '131.01.01 Suministros de Oficina', 20, 0, 20, 'Proveedor Suministros TIC S.A.', 'Factura 002-100-001243', 'admin@institucion.gob.ec'],
      ['MOV-0004', fecha, 'CONSUMO', 'EX-0002', 'Tóner HP LaserJet Original 85A Negro', '131.01.01 Suministros de Oficina', 0, 2, 18, 'Dirección Financiera', 'Cambio de cartucho agotado', 'admin@institucion.gob.ec']
    ];
    sheetMov.getRange(2, 1, movsInit.length, movsInit[0].length).setValues(movsInit);
  }
}

/**
 * Crea o actualiza el usuario administrador inicial
 */
function crearAdminInicial() {
  var ss = getDB();
  var sheet = ss.getSheetByName('USUARIOS');
  if (!sheet) {
    inicializarBaseDatos();
    sheet = ss.getSheetByName('USUARIOS');
  }

  var email = 'admin@institucion.gob.ec';
  var pass = generarPasswordTemporal_();
  var passHash = hashPassword(pass);
  var fecha = getFechaHoraActual();

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase().trim() === email) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 4).setValue(passHash);
    sheet.getRange(rowIndex, 5).setValue('ADMINISTRADOR');
    sheet.getRange(rowIndex, 6).setValue('ACTIVO');
    invalidarSesionesUsuario_(email);
  } else {
    sheet.appendRow(['USR-0001', 'Administrador General', email, passHash, 'ADMINISTRADOR', 'ACTIVO', fecha, '']);
  }

  var msg = 'Usuario Administrador creado/actualizado:\n\nEmail: ' + email + '\nContraseña temporal: ' + pass +
    '\n\nGuárdela ahora: no se vuelve a mostrar. Cámbiela desde Usuarios del Sistema.';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('Administrador Listo', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { }

  return { success: true, email: email, password: pass };
}

/**
 * Muestra la URL de la Web App en un cuadro de diálogo
 */
function mostrarUrlWebApp() {
  var url = ScriptApp.getService().getUrl();
  var ui = SpreadsheetApp.getUi();
  if (url) {
    ui.alert('Enlace de la Web App', 'URL Pública del Sistema:\n\n' + url, ui.ButtonSet.OK);
  } else {
    ui.alert('Web App no publicada', 'Aún no ha implementado la aplicación.\nVaya a "Implementar" > "Nueva implementación" > Tipo "Aplicación web".', ui.ButtonSet.OK);
  }
}
