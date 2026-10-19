# GUÍA PASO A PASO DE INSTALACIÓN Y PUBLICACIÓN EN GOOGLE APPS SCRIPT
**Versión 2.7.0 | Google Apps Script + Google Sheets + Google Drive**

Esta guía detalla el procedimiento oficial y verificado para desplegar el **Sistema Web Integral de Control de Bienes y Existencias** en su cuenta institucional de Google Workspace o cuenta Gmail personal en menos de 10 minutos.

---

## Paso 1: Crear o Seleccionar la Hoja de Google Sheets

1. Ingrese a [Google Drive](https://drive.google.com).
2. Haga clic en **+ Nuevo** > **Hojas de cálculo de Google** > **Hoja de cálculo en blanco**.
3. Asigne el nombre oficial al archivo (en la esquina superior izquierda):
   ```
   SISTEMA_CONTROL_BIENES_EXISTENCIAS
   ```
4. *(Opcional)* Si utilizará un script independiente de Apps Script (no vinculado directamente a la hoja), copie el ID de la hoja desde la URL del navegador:
   `https://docs.google.com/spreadsheets/d/ID_DE_SU_HOJA/edit` y péguelo en `CONFIG.SPREADSHEET_ID` dentro de `Code.js`.

---

## Paso 2: Abrir el Editor de Google Apps Script

1. En el menú superior de la hoja de cálculo de Google Sheets, diríjase a:
   ```
   Extensiones > Apps Script
   ```
2. Se abrirá una nueva pestaña con el entorno de desarrollo en la nube de Google Apps Script.
3. En la esquina superior izquierda, cambie el nombre del proyecto de *"Proyecto sin título"* a:
   ```
   SISTEMA_CONTROL_BIENES_EXISTENCIAS
   ```

---

## Paso 3: Configurar el Manifiesto `appsscript.json`

1. En el menú lateral izquierdo de Apps Script, haga clic en el icono de **⚙️ Configuración del proyecto** (rueda dentada).
2. Marque la casilla:
   - `[x] Mostrar el archivo de manifiesto "appsscript.json" en el editor`.
3. Vuelva a la pestaña del **Editor** (`< >`).
4. Haga clic en el archivo `appsscript.json` que ahora aparece en la lista de archivos y reemplace todo su contenido con lo siguiente:
   ```json
   {
     "timeZone": "America/Guayaquil",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "webapp": {
       "executeAs": "USER_DEPLOYING",
       "access": "ANYONE_ANONYMOUS"
     },
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/script.container.ui",
       "https://www.googleapis.com/auth/drive",
       "https://www.googleapis.com/auth/script.send_mail",
       "https://www.googleapis.com/auth/script.scriptapp"
     ]
   }
   ```
   > **Nota Crítica de Despliegue:** El valor `"access": "ANYONE_ANONYMOUS"` es indispensable para permitir que la aplicación web cargue correctamente y se autentique contra la base de datos institucional sin provocar pantallas en blanco provocadas por la redirección de cuentas de Google.
5. Guarde los cambios presionando `Ctrl + S`.

---

## Paso 4: Crear los 15 Archivos de Backend (.gs)

Para cada archivo de la lista, haga clic en el botón **+** (junto a "Archivos") > seleccione **Secuencia de comandos**, asigne el nombre indicado (sin escribir `.gs`) y pegue el código fuente correspondiente desde la carpeta `apps_script/`:

| # | Nombre en Apps Script | Archivo de Origen | Descripción |
| :-: | :--- | :--- | :--- |
| 1 | `Code` | `apps_script/Code.js` | Enrutador principal `doGet`, helpers, criptografía y `LockService` |
| 2 | `SetupDB` | `apps_script/SetupDB.js` | Inicializador de las 10 hojas, menú de Google Sheets y demo |
| 3 | `Login` | `apps_script/Login.js` | Autenticación, protección de fuerza bruta, sesiones y cambio de clave |
| 4 | `Usuarios` | `apps_script/Usuarios.js` | Gestión de usuarios, validación de roles y política de claves |
| 5 | `Bienes` | `apps_script/Bienes.js` | CRUD de bienes patrimoniales BLD/BCA, correlativos y validaciones |
| 6 | `Fotos` | `apps_script/Fotos.js` | Almacenamiento seguro de fotografías en Google Drive |
| 7 | `Custodios` | `apps_script/Custodios.js` | Control de custodios, actas de entrega y cascada en bienes |
| 8 | `Existencias` | `apps_script/Existencias.js` | Catálogo de suministros y umbrales de stock mínimo |
| 9 | `Movimientos` | `apps_script/Movimientos.js` | Kardex atómico con bloqueo de concurrencia |
| 10 | `Constatacion` | `apps_script/Constatacion.js` | Auditoría física móvil y conciliación con ajuste automático |
| 11 | `Rondas` | `apps_script/Rondas.js` | Constatación planificada por rondas y actas |
| 12 | `Alertas` | `apps_script/Alertas.js` | Triggers diarios automáticos y notificaciones por correo |
| 13 | `Importacion` | `apps_script/Importacion.js` | Validador masivo de lotes Excel / CSV |
| 14 | `Reportes` | `apps_script/Reportes.js` | KPIs de Dashboard y reporte de depreciación en línea recta |
| 15 | `Auditoria` | `apps_script/Auditoria.js` | Bitácora de trazabilidad inmutable |

---

## Paso 5: Crear los 6 Archivos de Frontend (.html)

Haga clic en el botón **+** (junto a "Archivos") > seleccione **HTML**, asigne el nombre exacto y pegue el contenido respectivo desde la carpeta `apps_script/`:

| # | Nombre en Apps Script | Archivo de Origen | Propósito en el Frontend |
| :-: | :--- | :--- | :--- |
| 1 | `index` | `apps_script/index.html` | Plantilla SPA principal, login, sidebar y ventanas modales |
| 2 | `style` | `apps_script/style.html` | Hoja de estilos CSS institucional responsive |
| 3 | `app_js` | `apps_script/app_js.html` | Controlador principal de la SPA y llamadas RPC |
| 4 | `charts_js` | `apps_script/charts_js.html` | Gráficos analíticos con Chart.js |
| 5 | `scanner_js` | `apps_script/scanner_js.html` | Módulo de escáner óptico (ZXing + jsQR + Linterna) |
| 6 | `mejoras_js` | `apps_script/mejoras_js.html` | Rondas, fotos Drive, etiquetas QR en lote y configuración |

Guarde todos los archivos creados (`Ctrl + S`).

---

## Paso 6: Inicialización de la Base de Datos y Permisos

El sistema incluye asistentes automatizados para dejar la base de datos lista en 1 clic:

### 6.1. Inicializar las 10 Hojas Canónicas
1. En la barra superior de herramientas del editor, seleccione la función:
   ```
   inicializarBaseDatos
   ```
2. Haga clic en el botón **▶ Ejecutar**.
3. **Flujo de Autorización de Permisos:**
   - Aparecerá la ventana *"Se necesita autorización"*. Haga clic en **Revisar permisos**.
   - Seleccione su cuenta de Google.
   - Si visualiza el aviso *"Google no ha verificado esta aplicación"*, presione **Configuración avanzada** (o *Advanced*) y luego haga clic en **Ir a SISTEMA_CONTROL_BIENES_EXISTENCIAS (no seguro)**.
   - Presione **Permitir**.
4. La ejecución creará las 10 hojas con sus encabezados oficiales, colores institucionales y formatos de texto.

### 6.2. Autorizar Permisos de Drive, Correo y Disparadores
1. Seleccione y ejecute la función:
   ```
   autorizarPermisos
   ```
2. Esta función invoca los servicios `DriveApp`, `MailApp` y `ScriptApp` para garantizar que la cuenta tenga todos los privilegios requeridos para almacenar fotografías de bienes y despachar las alertas diarias por correo.

### 6.3. Generar la Cuenta de Administrador Inicial
1. Seleccione y ejecute la función:
   ```
   crearAdminInicial
   ```
2. El sistema creará la cuenta institucional con las siguientes características:
   - **Email:** `admin@institucion.gob.ec`
   - **Contraseña Temporal Segura:** Se genera una clave aleatoria alfanumérica única (ej. `K9mP2xW7#7`).
3. El sistema mostrará la contraseña en un cuadro de diálogo emergente y la registrará en el **Registro de ejecución (Logs)** de Apps Script.
   > **IMPORTANTE:** Copie y guarde esta contraseña temporal inmediatamente. Al iniciar sesión por primera vez, cámbiela desde el icono de llave en el perfil de usuario.

---

## Paso 7: Menú Nativo en Google Sheets (`🏢 Sistema Inventario`)

Al recargar la hoja de cálculo de Google Sheets en el navegador, observará en el menú superior un menú personalizado titulado:
```
🏢 Sistema Inventario
  ├── 🚀 Inicializar / Reparar Base de Datos
  ├── 👤 Crear Usuario Administrador Inicial
  ├── 🧪 Cargar Datos de Demostración
  ├── 🔑 Autorizar permisos (Drive y correo)
  └── 🌐 Obtener URL de la Web App
```
Cualquiera de estas tareas de mantenimiento puede ejecutarse desde este menú sin necesidad de abrir el editor de código.

---

## Paso 8: Implementar y Publicar la Aplicación Web (Web App)

1. En la esquina superior derecha del editor de Apps Script, haga clic en el botón azul **Implementar** > **Nueva implementación**.
2. En la ventana emergente, haga clic en el icono de engranaje ⚙️ (*Seleccionar tipo*) y elija **Aplicación web**.
3. Complete los siguientes campos con exactitud:
   - **Descripción:** `SISTEMA PATRIMONIAL v2.7.0`
   - **Ejecutar como:** `Yo (mi cuenta de Google / User Deploying)`  
     *(Permite que la Web App acceda a Sheets y Drive con los permisos del propietario sin exigir permisos técnicos individuales a cada usuario del sistema)*.
   - **Quién tiene acceso:** `Cualquier persona` (*Anyone / Anyone anonymous*).
4. Haga clic en el botón azul **Implementar**.
5. Copie la **URL de la aplicación web** generada:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Paso 9: Pruebas Iniciales en Computadora y Teléfono Móvil

1. **Acceso desde Computadora:**
   - Abra la URL en cualquier navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
   - Ingrese con `admin@institucion.gob.ec` y la contraseña temporal generada en el Paso 6.3.
2. **Acceso y Escaneo desde Smartphone / Tablet:**
   - Abra la misma URL en el navegador de su teléfono móvil (Chrome en Android, Safari en iOS).
   - Inicie sesión con su usuario.
   - Ingrese a **Constatación Móvil** o **Constatación por Rondas**.
   - Presione **Iniciar Cámara** y conceda permisos de acceso a la cámara cuando el navegador lo solicite.
   - Enfoque cualquier código QR o código de barras impreso para verificar el activo en tiempo real.
3. **Activar Alertas por Correo Electrónico:**
   - Desde el menú lateral, ingrese a **Configuración y Alertas** (solo Administrador).
   - Ingrese los correos destinatarios, seleccione la hora de envío diario (ej. 07:00 AM) y marque la casilla de activación.
   - Presione **Guardar Configuración** y luego **Enviar correo de prueba** para verificar la recepción del mensaje.

---

## Solución a Problemas Frecuentes

| Problema | Causa Raíz | Solución |
| :--- | :--- | :--- |
| **Pantalla en blanco tras presionar Ingresar** | `appsscript.json` contiene `"access": "ANYONE"` en lugar de `"ANYONE_ANONYMOUS"`. | Cambie el valor a `"ANYONE_ANONYMOUS"` en `appsscript.json`, guarde y cree una **Nueva versión de implementación**. |
| **Error: "No se detectó una hoja de cálculo vinculada"** | El script fue creado como archivo independiente sin enlazar. | Abra `Code.js` y coloque el ID de su hoja de cálculo en `CONFIG.SPREADSHEET_ID`. |
| **Error: "Falta la columna FOTO_ID o STOCK_MINIMO"** | La hoja de cálculo proviene de una versión anterior. | Vaya al menú de la hoja `🏢 Sistema Inventario` y presione `🚀 Inicializar / Reparar Base de Datos`. |
| **Error al subir fotos: "No tiene permisos para Drive"** | No se ejecutó la autorización de servicios externos. | Ejecute la función `autorizarPermisos()` desde el editor o desde el menú de la hoja. |
| **Cámara no inicia en el teléfono celular** | El sitio no se está cargando bajo protocolo seguro HTTPS o el navegador denegó el permiso. | Apps Script opera bajo HTTPS por defecto. Asegúrese de pulsar "Permitir" cuando el navegador solicite acceso a la cámara del dispositivo. |
