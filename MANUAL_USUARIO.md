# MANUAL DE USUARIO INSTITUCIONAL
## Sistema Web Integral de Control de Bienes y Existencias
**Versión 2.7.0 | Plataforma Corporativa en Google Apps Script + Google Sheets + Google Drive**

---

## 1. Introducción y Objetivos del Sistema

El **Sistema Web Integral de Control de Bienes y Existencias** es la plataforma tecnológica oficial para la administración, custodia, control físico y trazabilidad del patrimonio público institucional. Permite gestionar con rigor técnico:
- **Activos Fijos Patrimoniales:** Bienes de Larga Duración (**BLD**) y Bienes de Control Administrativo (**BCA**).
- **Control de Suministros y Consumibles:** Inventario de bodega y movimientos atómicos en **Kardex**.
- **Constataciones Físicas en Terreno:** Escaneo óptico móvil (códigos QR y de barras) mediante la cámara de smartphones o tablets.
- **Constatación Planificada por Rondas:** Verificación sistemática por custodio o por ubicación con actas PDF y firmas de descargo.
- **Gestión Fotográfica en la Nube:** Almacenamiento optimizado de imágenes en Google Drive privado.
- **Depreciación Contable:** Cálculo automatizado en línea recta con porcentajes residuales configurables.
- **Alertas Automatizadas:** Notificaciones diarias por correo electrónico para productos bajo stock mínimo.

---

## 2. Roles del Sistema y Alcance Operativo

El sistema implementa **Control de Acceso Basado en Roles (RBAC)** con tres perfiles institucionales:

| Perfil / Rol | Alcance Operativo y Responsabilidades |
| :--- | :--- |
| **ADMINISTRADOR** | Control total de la plataforma. Configuración general, alertas automáticas por correo, gestión de usuarios, carga masiva desde Excel/CSV, bajas patrimoniales, eliminación física de bienes/custodios y consulta de auditoría. |
| **INVENTARIADOR** | Operación cotidiana de almacén y campo. Creación y edición de bienes, subida de fotos, gestión de custodios, inventario de existencias, transacciones de Kardex, constatación móvil por cámara, ejecución de rondas y emisión de actas. |
| **CONSULTA** | Acceso de solo lectura para auditoría interna, fiscalización, control financiero y visualización de saldos. Puede explorar todos los catálogos, ver fotos, revisar la bitácora de auditoría y descargar reportes oficiales en Excel/PDF. |

---

## 3. Acceso al Sistema y Seguridad de la Cuenta

### 3.1. Inicio de Sesión
1. Abra el enlace oficial de la aplicación web en cualquier navegador moderno.
2. Ingrese su **Correo Electrónico Institucional** y su **Contraseña**.
3. Presione el botón **INGRESAR AL SISTEMA**.
4. Su sesión se mantendrá activa durante un máximo de **6 horas**.

> **Protección contra Fuerza Bruta:** El sistema bloquea temporalmente el acceso durante **15 minutos** si se ingresan 5 contraseñas incorrectas de manera consecutiva para una misma cuenta de correo.

### 3.2. Cambio de Contraseña Propia
Cualquier usuario autenticado puede actualizar su propia contraseña en cualquier momento:
1. En la parte inferior del menú lateral (junto a su nombre y avatar), haga clic en el icono de **Llave** (<i class="bi bi-key"></i>).
2. Ingrese su contraseña actual.
3. Ingrese su nueva clave cumpliendo la política de seguridad:
   - Longitud mínima de **8 caracteres**.
   - Combinación obligatoria de **letras y números**.
4. Repita la nueva contraseña y presione **Actualizar**.
5. Por seguridad, el sistema cerrará todas las sesiones activas en cualquier otro dispositivo, solicitando que vuelva a iniciar sesión con su nueva clave.

---

## 4. Tablero de Control (Dashboard)

El Dashboard presenta indicadores consolidados calculados en tiempo real:

- **Indicadores Numéricos Superiores (KPIs):**
  * **Total Bienes:** Conteo consolidado discriminado en activos `BLD` y `BCA`.
  * **Valor Contable Total:** Valorización económica en dólares ($) de los activos no dados de baja.
  * **Suministros en Almacén:** Total de productos en bodega y conteo de ítems bajo stock mínimo.
  * **Movimientos del Mes:** Entradas y salidas operadas en el mes calendario en curso.
- **Gráficos Interactivos (Chart.js):**
  * **Dona de Condición Física:** Distribución porcentual de bienes clasificados como Nuevo, Bueno, Regular, Malo, Dañado, Obsoleto y Baja.
  * **Top Custodios:** Gráfico de barras horizontales con los funcionarios públicos que tienen mayor cantidad de activos asignados.
  * **Flujo Mensual de Existencias:** Comparativa visual entre unidades ingresadas y unidades despachadas durante el mes.

---

## 5. Módulo de Bienes Muebles e Inmuebles (BLD / BCA)

### 5.1. Registrar un Nuevo Bien Patrimonial
1. Diríjase a **Bienes (BLD / BCA)** en el menú lateral.
2. Presione el botón azul **+ Nuevo Bien**.
3. Seleccione el **Tipo de Bien**:
   - `BLD`: Bien de Larga Duración (equipos de computación, servidores, vehículos, maquinaria).
   - `BCA`: Bien de Control Administrativo (mobiliario de oficina, escritorios, estanterías).
4. Deje el campo **Código** en blanco si desea que el sistema genere automáticamente el correlativo oficial seguro (ej. `BLD-00004` o `BCA-00003`).
5. Complete la denominación del bien, serie del fabricante, modelo, marca, color, material y dimensiones.
6. Asigne el **Custodio Responsable** seleccionándolo del padrón institucional.
7. Indique la **Ubicación Física**, **Cuenta Contable**, **Vida Útil (años)**, **Valor Contable ($)** y la **Fecha de Adquisición** (AAAA-MM-DD).
8. Presione **Guardar Bien**.

### 5.2. Fotografías de Bienes (Google Drive)
Cada bien patrimonial puede tener vinculada una fotografía oficial alojada en la carpeta privada `SISTEMA_BIENES_FOTOS` de Google Drive:
1. **Subir Foto al Registrar o Editar:**
   - En el formulario del bien, diríjase a la sección **Fotografía del Bien**.
   - Presione **Subir Foto** y elija una imagen desde su computador o tome una foto directamente con la cámara de su celular.
   - El sistema optimiza y comprime automáticamente la foto en el navegador a máximo 1024 píxeles (formato JPEG al 80%) antes de enviarla, ahorrando datos móviles y espacio de almacenamiento.
2. **Visualizar la Foto:**
   - En la tabla de bienes, haga clic en el botón de cámara (<i class="bi bi-camera"></i>) en la fila del bien correspondiente.
   - Se abrirá la imagen nítida en tamaño ampliado sin necesidad de exponer enlaces públicos de Drive.
3. **Eliminar Foto:**
   - En la vista de edición del bien, presione **Quitar Foto**. El archivo se trasladará automáticamente a la papelera de Google Drive.

### 5.3. Impresión de Etiquetas QR Oficiales
- **Etiqueta Individual:**
  1. En la fila del bien, presione el icono **QR** (<i class="bi bi-qr-code"></i>).
  2. Se abrirá la etiqueta oficial con el código QR generado, denominación, código patrimonial y custodio.
  3. Presione **Imprimir Etiqueta** para imprimir en impresoras térmicas de etiquetas adhesivas o impresoras estándar.
- **Lote Masivo de Etiquetas en PDF:**
  1. Filtre en la tabla los bienes deseados (por custodio, ubicación o tipo).
  2. Presione el botón superior **Etiquetas QR en PDF (Lote)**.
  3. El sistema compilará un archivo PDF tamaño **A4** con una cuadrícula de **3 columnas x 8 filas (24 etiquetas por página)**, listo para imprimir en hojas de etiquetas adhesivas tamaño carta/A4.

### 5.4. Dar de Baja un Bien
1. En la fila del activo, presione el botón de baja (<i class="bi bi-arrow-down-circle"></i>).
2. Escriba la motivación técnica o legal (ej. *Informe Técnico TIC-2026-08 por obsolescencia*).
3. El estado del activo pasará a `BAJA` y se excluirá automáticamente del valor contable patrimonial activo.

### 5.5. Eliminación Física de un Bien (Solo Administrador)
1. Presione el botón de eliminar (<i class="bi bi-trash"></i>) en la fila correspondiente.
2. Al confirmar, el sistema suprimirá el registro de la hoja de cálculo y mandará a la papelera de Google Drive la fotografía asociada de forma automática.

---

## 6. Módulo de Custodios y Asignaciones

1. Ingrese a **Custodios** en el menú lateral.
2. Cada custodio muestra en tiempo real la cantidad de bienes activos bajo su cargo.
3. **Crear o Modificar Custodio:**
   - Presione **+ Nuevo Custodio**. Ingrese Cédula, Nombres y Apellidos, Cargo, Departamento y Ubicación.
   - *Actualización en Cascada:* Si modifica el nombre de un custodio, el sistema actualizará de manera transparente y simultánea todos los bienes que tenía asignados en el inventario.
4. **Protección de Integridad:**
   - El sistema impedirá eliminar a un custodio que mantenga bienes activos asignados. Debe reasignar los bienes o cambiar su estado a `INACTIVO`.
5. **Generar Acta de Entrega - Recepción:**
   - En la fila del custodio, presione el icono de documento (<i class="bi bi-file-earmark-text"></i>).
   - Se presentará el acta oficial con la nómina exhaustiva de bienes a su cargo.
   - Presione **Imprimir Acta** para obtener el documento impreso con los espacios formales de firma y descargo institucional.

---

## 7. Módulo de Existencias y Almacén

### 7.1. Catálogo de Suministros
1. Diríjase a **Existencias**.
2. Cada producto muestra código, cuenta contable, descripción, saldo actual en bodega y su umbral de stock mínimo.
3. **Indicadores Automáticos de Reabastecimiento:**
   - **Bajo Stock (Amarillo):** Se activa si la cantidad actual es menor o igual al `STOCK_MINIMO` configurado.
   - **Stock Crítico (Rojo):** Se activa si la cantidad actual es menor o igual a un tercio del mínimo (`min / 3`).

### 7.2. Crear Producto y Configurar Stock Mínimo
1. Presione **+ Nueva Existencia**.
2. Ingrese Código, Descripción, Cuenta Contable, Cantidad Inicial y el **Stock Mínimo Deseado** (por defecto 15).
3. Si ingresa una cantidad inicial mayor a cero, el sistema generará automáticamente la transacción de apertura en el Kardex.
4. Para ajustar el stock mínimo de un producto existente, presione el botón de edición o modifique el valor directamente.

---

## 8. Módulo de Kardex y Movimientos

1. Ingrese a **Kardex / Movimientos** y presione **+ Registrar Movimiento**.
2. Seleccione el producto consumible de la lista. El sistema mostrará su saldo vigente en bodega.
3. Seleccione el **Tipo de Operación**:
   - `INGRESO POR COMPRA` o `DEVOLUCIÓN`: Aumentan el saldo (+).
   - `ENTREGA`, `CONSUMO` o `BAJA`: Disminuyen el saldo (-).
   - `AJUSTE`: Corrección física de inventario (indique si es positivo o negativo).
4. Ingrese la cantidad, el responsable o solicitante y el documento de respaldo (ej. *Factura Nro. 001-020-004928*).
5. Al hacer clic en **Guardar**, el sistema aplica un bloqueo de concurrencia (`LockService`), asienta la fila en el Kardex y recalcula de forma atómica el stock disponible en la hoja de existencias.

---

## 9. Constatación Física Móvil con Escáner Óptico

Este módulo está especialmente optimizado para teléfonos celulares y tablets en recorridos de campo:

1. Ingrese a **Constatación Móvil** en el menú.
2. Seleccione el modo de inspección: **Bienes (BLD / BCA)** o **Existencias (Suministros)**.
3. Presione el botón verde **Iniciar Cámara**.
4. **Herramientas de Cámara:**
   - **Cámara Trasera:** Seleccione la cámara principal de su dispositivo desde la lista desplegable.
   - **Linterna / Flash:** En lugares con baja iluminación, active el botón de linterna (<i class="bi bi-lightning-fill"></i>).
   - **Subir Foto:** Si la cámara física no enfoca correctamente, presione **Escanear desde Imagen** para cargar una fotografía tomada con la aplicación nativa de su celular.
5. **Inspección del Bien:**
   - Al enfocar la etiqueta QR, el dispositivo emitirá un pitido de confirmación sonora y mostrará la ficha técnica del bien en pantalla.
   - Elija la **Condición Física Observada** (`BUENO`, `REGULAR`, `MALO`, `DAÑADO`, `OBSOLETO`).
   - Ingrese las novedades técnicas detectadas.
   - Si desea que la ficha del bien adopte la nueva condición observada, marque la casilla correspondiente.
   - Presione **Confirmar y Guardar Constatación**.
6. **Inspección de Existencias:**
   - Ingrese el conteo físico real verificado en percha.
   - El sistema calculará la diferencia respecto al sistema (`Físico - Sistema`).
   - Marque la opción **Ajustar Kardex Automáticamente** si desea que una merma o sobrante genere de forma inmediata el movimiento de ajuste en la bodega.

---

## 10. Constatación Física por Rondas

El módulo de **Constatación por Rondas** permite planificar y ejecutar auditorías patrimoniales completas de manera metódica, asegurando que no quede ningún bien sin inspeccionar:

### 10.1. Crear una Ronda de Constatación
1. Diríjase a **Constatación por Rondas**.
2. En la sección superior, seleccione el criterio de agrupación:
   - **Por Custodio:** Carga todos los bienes activos asignados a un servidor público específico.
   - **Por Ubicación:** Carga todos los activos registrados en una oficina, piso o edificio determinado.
3. Presione **Iniciar Ronda**. El sistema creará un código único (ej. `RON-0002`) y cargará la lista completa de bienes en estado `PENDIENTE`.

### 10.2. Ejecutar la Verificación en Terreno
- La pantalla presenta una barra de progreso que indica en tiempo real el porcentaje auditado.
- Para cada bien de la lista, el inspector dispone de acciones rápidas:
  * **Conforme (<i class="bi bi-check-lg text-success"></i>):** Marca el bien como `VERIFICADO` manteniendo la condición del sistema.
  * **Con Novedad (<i class="bi bi-exclamation-triangle text-warning"></i>):** Abre una ventana emergente para registrar daños, cambios de condición o cambio de oficina, con la opción de actualizar la ficha maestra.
  * **No Encontrado (<i class="bi bi-x-lg text-danger"></i>):** Marca el activo como `FALTANTE` para la respectiva investigación de responsabilidades.
  * **Deshacer (<i class="bi bi-arrow-counterclockwise"></i>):** Regresa el ítem al estado `PENDIENTE`.

### 10.3. Cerrar Ronda y Descargar Acta en PDF
1. Una vez concluida la inspección, presione **Cerrar Ronda**.
2. Si aún quedan bienes pendientes, el sistema solicitará una confirmación explícita para evitar cierres accidentales.
3. Presione el botón **Acta en PDF**. El sistema generará instantáneamente un documento formal con la relación pormenorizada de activos verificados, novedades detectadas, faltantes y los recuadros oficiales de firma del responsable de constatación y del custodio.

---

## 11. Historial de Constataciones

1. Ingrese a **Historial de Constataciones**.
2. Permite examinar la bitácora histórica de auditorías individuales realizadas sobre bienes o existencias.
3. Utilice la casilla **Ver solo diferencias** para filtrar únicamente aquellos activos cuya condición física fue distinta a la del sistema o productos con discrepancias en bodega.

---

## 12. Módulo de Carga Masiva (Excel / CSV)
*(Exclusivo para perfil Administrador)*

1. Ingrese a **Carga Masiva (Excel)** en el menú lateral.
2. Seleccione el módulo destino: **Bienes** o **Existencias**.
3. Seleccione el archivo `.xlsx` o `.csv` desde su computador.
4. El sistema someterá cada registro a un proceso riguroso de validación:
   - **Filas en Verde (Válidas):** Cumplen con todas las reglas, códigos no duplicados y fechas válidas.
   - **Filas en Rojo (Con Error):** Muestran el detalle exacto del error (ej. tipo de bien inválido, código ya existente en la base de datos, valor numérico erróneo).
5. Presione **Confirmar e Importar Filas Válidas**. El sistema insertará los registros aplicando bloqueo de concurrencia y generará los movimientos de apertura en Kardex si corresponde.

---

## 13. Módulo de Reportes y Depreciación Contable

Desde la sección **Reportes & Etiquetas**, la institución puede generar y descargar:

1. **Descargar Inventario General (Excel):** Exporta la totalidad de bienes activos con series, marcas, modelos, custodios, ubicaciones y valores contables.
2. **Descargar Stock de Existencias (Excel):** Planilla completa de consumibles con saldos y alertas de stock mínimo.
3. **Descargar Kardex de Movimientos (Excel):** Bitácora transaccional filtrada por rango de fechas y tipo de movimiento.
4. **Reporte Oficial de Depreciación en Línea Recta:**
   - Calcula para cada activo:
     * **Valor Contable** y **Valor Residual** (% parametrizable).
     * **Monto Depreciable** = `Valor Contable - Valor Residual`.
     * **Cuota Mensual** = `Monto Depreciable / (Vida Útil en Años × 12)`.
     * **Meses Transcurridos** calculados desde la `FECHA_ADQUISICION` (o fecha de registro estimada).
     * **Depreciación Acumulada** y **Valor en Libros**.
     * **Estado:** *En Depreciación*, *Totalmente Depreciado* o *Sin Vida Útil*.

---

## 14. Módulo de Configuración y Alertas por Correo
*(Exclusivo para perfil Administrador)*

1. Diríjase a **Configuración y Alertas** en el menú lateral.
2. **Alertas de Stock Bajo por Correo:**
   - Marque la casilla **Activar envío automático diario**.
   - Ingrese los correos electrónicos de los destinatarios (separados por coma o espacio).
   - Elija la **Hora de Envío Diario** (ej. 07:00 AM). El sistema programará un disparador automático en Google Apps Script.
   - Cada día a esa hora, si existen productos bajo el stock mínimo, el sistema enviará un informe consolidado en formato de tabla HTML a los correos configurados.
3. **Parámetro de Depreciación Contable:**
   - Configure el **% de Valor Residual** institucional (por defecto 10%).
4. **Prueba de Funcionamiento:**
   - Presione **Guardar Configuración**.
   - Presione **Enviar correo de prueba** para validar que la integración con el servicio de correo de Google funcione correctamente.

---

## 15. Módulo de Usuarios del Sistema
*(Exclusivo para perfil Administrador)*

1. Ingrese a **Usuarios del Sistema**.
2. **Crear Nuevo Usuario:** Ingrese Nombre completo, Correo institucional, Contraseña inicial y Rol asignado (`ADMINISTRADOR`, `INVENTARIADOR`, `CONSULTA`).
3. **Editar Usuario:** Permite modificar el nombre, rol o cambiar el estado a `INACTIVO`.
4. **Reglas de Seguridad Estrictas:**
   - No es posible desactivar ni eliminar la propia cuenta de administrador en uso.
   - El sistema no permite eliminar o degradar la cuenta si es el único administrador activo del sistema.
   - Modificar el rol, estado o clave de un usuario invalida de forma instantánea cualquier sesión que tenga abierta.

---

## 16. Bitácora de Auditoría y Trazabilidad

1. Ingrese a **Auditoría de Cambios** en el menú.
2. Muestra un libro de registro cronológico inmutable con:
   - Fecha y hora exacta del evento.
   - Correo electrónico del usuario responsable.
   - Tipo de acción (`CREAR`, `MODIFICAR`, `BAJA`, `ELIMINAR`, `LOGIN`, `IMPORTACION_MASIVA`, `ALERTA`).
   - Módulo afectado y código del registro.
   - Valores previos y valores nuevos para garantizar la máxima transparencia en la gestión pública.
