# Plan de Implementación: Sistema de Mantenimiento Preventivo

## Objetivo
Agregar funcionalidad para marcar puntos que ya tienen mantenimiento preventivo realizado, con:
- Indicador visual (estrella) en el marcador del mapa
- Campo para guardar número de ticket de mantenimiento
- Filtro para ver puntos con/sin mantenimiento
- Diseño limpio y no invasivo visualmente

## Cambios a Realizar

### 1. Estructura de Datos (datos_puntos.json)
- Agregar campo `mantenimientoPreventivo` (objeto) a cada punto con:
  - `realizado`: boolean
  - `numeroTicket`: string
  - `fechaMantenimiento`: string (ISO date)

### 2. Interfaz de Usuario - HTML (index.html)

#### a) Nuevo filtro en sidebar
- Agregar sección de filtro "Estado de Mantenimiento" con opciones:
  - Con mantenimiento ✓
  - Sin mantenimiento
  - Mostrar todos

#### b) Modal para editar mantenimiento
- Crear modal flotante para editar información de mantenimiento:
  - Checkbox "Mantenimiento realizado"
  - Input para número de ticket
  - Botón guardar/cancelar

### 3. Estilos CSS (styles.css)

#### a) Indicador visual en marcadores
- Agregar clase para estrella dorada en esquina superior derecha del marcador
- Animación sutil al marcar/desmarcar

#### b) Estilos del modal
- Diseño limpio y moderno con glassmorphism
- Responsive y centrado

#### c) Estilos del filtro
- Integrar con el diseño existente del sidebar

### 4. Lógica JavaScript (app.js)

#### a) Variables globales
- `selectedMantenimiento`: Set para filtro de mantenimiento
- `mantenimientoData`: objeto para almacenar datos de mantenimiento en localStorage

#### b) Funciones de persistencia
- `loadMantenimientoData()`: cargar desde localStorage
- `saveMantenimientoData()`: guardar en localStorage
- `updatePuntoMantenimiento(codigoPV, data)`: actualizar punto específico

#### c) Funciones de UI
- `renderMantenimientoFilter()`: renderizar filtro en sidebar
- `createMantenimientoModal()`: crear modal de edición
- `openMantenimientoModal(punto)`: abrir modal con datos del punto
- `closeMantenimientoModal()`: cerrar modal

#### d) Modificar funciones existentes
- `createCustomIcon()`: agregar estrella dorada si tiene mantenimiento
- `createPopupContent()`: agregar botón para editar mantenimiento
- `applyFilters()`: incluir filtro de mantenimiento
- `processData()`: cargar datos de mantenimiento desde localStorage

### 5. Servidor Python (server.py)
- Agregar endpoint POST `/api/mantenimiento` para guardar datos
- Agregar endpoint GET `/api/mantenimiento` para cargar datos
- Persistir en archivo JSON separado `mantenimiento_data.json`

## Flujo de Usuario

1. Usuario hace clic en un marcador y ve el popup
2. En el popup aparece un botón "✏ Editar Mantenimiento"
3. Se abre modal con:
   - Checkbox "Mantenimiento realizado"
   - Input "Número de ticket" (habilitado solo si checkbox está marcado)
4. Al guardar:
   - Datos se persisten en localStorage y servidor
   - Marcador se actualiza con estrella dorada
   - Filtros se actualizan
5. Usuario puede filtrar puntos por estado de mantenimiento

## Consideraciones de Diseño

### Visual
- Estrella dorada ⭐ en esquina superior derecha del marcador
- Color: #FFD700 (oro)
- Tamaño: 16px
- Sombra sutil para destacar sobre el marcador

### UX
- Modal aparece con animación fade-in
- Auto-focus en el input de ticket al abrir modal
- Validación: no permitir guardar ticket vacío si checkbox está marcado
- Confirmación visual al guardar (animación o mensaje)

### Performance
- Datos en localStorage para acceso rápido
- Sincronización con servidor en background
- No recargar mapa completo al actualizar un punto

## Archivos a Modificar

1. `index.html` - Agregar modal y filtro
2. `styles.css` - Estilos para estrella, modal y filtro
3. `app.js` - Lógica de mantenimiento y persistencia
4. `server.py` - Endpoints API (opcional, si se requiere persistencia en servidor)

## Orden de Implementación

1. Actualizar estructura de datos y localStorage
2. Crear modal HTML y estilos
3. Implementar lógica de apertura/cierre modal
4. Agregar estrella visual en marcadores
5. Implementar persistencia de datos
6. Agregar filtro de mantenimiento
7. Integrar con sistema de filtros existente
8. Pruebas y ajustes visuales
