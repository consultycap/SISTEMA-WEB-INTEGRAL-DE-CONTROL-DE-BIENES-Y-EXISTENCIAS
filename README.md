# 🏛️ SISTEMA WEB INTEGRAL DE CONTROL DE BIENES Y EXISTENCIAS
**Versión 2.7.0 | Google Apps Script + Google Sheets + Google Drive**

Plataforma corporativa de gestión de patrimonio institucional, activos fijos (BLD), bienes de control administrativo (BCA), inventario de existencias (Kardex), constataciones físicas móviles con escáner QR/cámara, gestión de fotografías en Google Drive, depreciación contable en línea recta y alertas automatizadas por correo.

---

## 📁 ESTRUCTURA COMPLETA DE ARCHIVOS

```
apps_script/
├── appsscript.json          <- Manifiesto con scopes de Sheets, Drive, MailApp y ANYONE_ANONYMOUS
├── Code.js                  <- Punto de entrada (doGet, LockService, correlativos, hash salteado)
├── SetupDB.js               <- Inicialización automática de las 10 hojas y menú institucional
├── Login.js                 <- Autenticación, protección de fuerza bruta, sesiones y cambio de clave
├── Usuarios.js              <- Gestión de usuarios, roles RBAC y política de contraseñas
├── Bienes.js                <- CRUD bienes BLD/BCA, fotos vinculadas y validación de adquisición
├── Fotos.js                 <- Integración de fotografías seguras en Google Drive
├── Custodios.js             <- Gestión de responsables, actas de entrega y cascada en bienes
├── Existencias.js           <- Control de suministros de bodega y alertas de stock mínimo
├── Movimientos.js           <- Kardex transaccional atómico protegido con LockService
├── Constatacion.js          <- Constatación física móvil con escáner óptico y ajuste automático
├── Rondas.js                <- Constatación sistemática por rondas (custodio/ubicación) y actas PDF
├── Alertas.js               <- Configuración y despacho diario de alertas de stock bajo por correo
├── Importacion.js           <- Validador e importador masivo desde Excel / CSV
├── Reportes.js              <- Dashboard KPIs, inventarios y reporte de depreciación en línea recta
├── Auditoria.js             <- Bitácora inmutable de trazabilidad y eventos de seguridad
├── index.html               <- Plantilla principal HTML5 (SPA con 12 vistas y modales)
├── style.html               <- Hoja de estilos CSS institucional responsive
├── app_js.html              <- Controlador frontend principal y enrutador SPA
├── charts_js.html           <- Módulo analítico de gráficos interactivos con Chart.js
├── scanner_js.html          <- Módulo de escáner óptico móvil (ZXing + jsQR + Linterna)
└── mejoras_js.html          <- Generador PDF de etiquetas en lote, rondas, fotos y alertas
```

---

## 🚀 PASOS DE DESPLIEGUE RÁPIDO

### 1. Vincular o Crear Hoja de Google Sheets
- Abra una hoja de Google Sheets en [Google Drive](https://drive.google.com).
- Vaya a **Extensiones** > **Apps Script**.

### 2. Configurar Manifiesto
- En **Configuración del proyecto**, marque `Mostrar archivo de manifiesto "appsscript.json"`.
- Reemplace el contenido de `appsscript.json` con el de `apps_script/appsscript.json` (asegúrese de que tenga `"access": "ANYONE_ANONYMOUS"`).

### 3. Copiar Archivos
- Cree los **15 archivos de script (.gs)** copiando el código respectivo de `apps_script/*.js`.
- Cree los **6 archivos HTML (.html)** copiando el contenido de `apps_script/*.html`.

### 4. Inicializar y Autorizar
- En el editor de Apps Script, ejecute la función `inicializarBaseDatos()` para crear las 10 hojas.
- Ejecute `autorizarPermisos()` para autorizar los permisos de Drive, Correo y Disparadores.
- Ejecute `crearAdminInicial()`: el sistema generará una contraseña temporal segura única que se mostrará en pantalla y en los registros de ejecución.

### 5. Desplegar Aplicación Web
- Clic en **Implementar** > **Nueva implementación** > Tipo: **Aplicación web**.
- Configuración:
  * **Ejecutar como:** `Yo (mi cuenta de Google)`
  * **Quién tiene acceso:** `Cualquier persona`
- Implemente y copie la URL generada.

---

## 🏢 HOJAS DE GOOGLE SHEETS CREADAS (10 HOJAS)

| Hoja | Descripción y Propósito |
| :--- | :--- |
| `USUARIOS` | Usuarios institucionales, credenciales salteadas y control de roles |
| `BIENES_MUEBLES_INMUEBLES` | Activos patrimoniales BLD y BCA (21 columnas con FOTO_ID y FECHA_ADQUISICION) |
| `CUSTODIOS` | Padrón de servidores públicos responsables de la tenencia de bienes |
| `EXISTENCIAS` | Suministros y consumibles de almacén con umbrales de stock mínimo |
| `MOVIMIENTOS_EXISTENCIAS` | Kardex transaccional atómico de entradas, salidas y ajustes |
| `CONSTACION_BIENES` | Auditoría física de bienes escaneados en terreno |
| `CONSTACION_EXISTENCIAS` | Conciliación física de bodega con cálculo de diferencias |
| `RONDAS` | Registro consolidado de rondas de inventario por custodio o lugar |
| `RONDAS_DETALLE` | Detalle ítem por ítem del avance de cada ronda de constatación |
| `AUDITORIA` | Bitácora inmutable de trazabilidad de todos los cambios del sistema |

---

## 📚 DOCUMENTACIÓN TÉCNICA DETALLADA

Toda la documentación técnica y operativa actualizada se encuentra en la carpeta `docs/`:
- [ARQUITECTURA.md](file:///c:/Users/Cristhian%20M/Documents/proyectos/SITEMA_INVENTARIO/docs/ARQUITECTURA.md): Arquitectura serverless, diagramas Mermaid, módulos backend/frontend, matriz RBAC y seguridad.
- [ESTRUCTURA_GOOGLE_SHEETS.md](file:///c:/Users/Cristhian%20M/Documents/proyectos/SITEMA_INVENTARIO/docs/ESTRUCTURA_GOOGLE_SHEETS.md): Diccionario de datos canónico de las 10 hojas, formatos `@`, tipos de datos y relaciones de integridad.
- [GUIA_INSTALACION_APPS_SCRIPT.md](file:///c:/Users/Cristhian%20M/Documents/proyectos/SITEMA_INVENTARIO/docs/GUIA_INSTALACION_APPS_SCRIPT.md): Paso a paso de instalación, configuración del manifiesto, permisos y resolución de problemas.
- [MANUAL_USUARIO.md](file:///c:/Users/Cristhian%20M/Documents/proyectos/SITEMA_INVENTARIO/docs/MANUAL_USUARIO.md): Manual de operación para cada rol y módulo institucional.
