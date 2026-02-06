# Mapa Interactivo de Puntos del Cesar

Una aplicación web interactiva para visualizar y filtrar puntos de venta y centros de atención en el departamento del Cesar, Colombia.

## Características
-  **Visualización de Mapa Interactivo**: Usa Leaflet.js para mostrar 946 puntos en el mapa del Cesar
-  **Filtros Avanzados**: Filtra por técnicos asignados, centros de costos (CDA) y tipo de punto
-  **Diseño Moderno**: Interfaz premium con tema oscuro, gradientes y animaciones suaves
-  **Estadísticas en Tiempo Real**: Visualiza el total de puntos, puntos visibles, técnicos y CDAs
-  **Clustering de Marcadores**: Agrupa puntos cercanos para mejor rendimiento y visualización
-  **Diseño Responsivo**: Funciona perfectamente en dispositivos móviles y de escritorio
-  **Búsqueda Integrada**: Busca técnicos y CDAs específicos en tiempo real
-  **Múltiples Capas de Mapa**: Alterna entre vista estándar y modo oscuro

## Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con variables CSS, gradientes y animaciones
- **JavaScript ES6+**: Lógica de la aplicación
- **Leaflet.js**: Biblioteca de mapas interactivos
- **Leaflet.markercluster**: Plugin para agrupar marcadores
- **Python**: Scripts de procesamiento de datos
- **Pandas**: Análisis y conversión de datos Excel a JSON

## Estructura del Proyecto

```
puntos-cesar/
│
├── index.html              # Página principal de la aplicación
├── styles.css              # Estilos CSS personalizados
├── app.js                  # Lógica de la aplicación
├── datos_puntos.json       # Datos de los puntos (generado)
│
├── base de datos cesar.xlsx  # Fuente de datos original
├── convertir_a_json.py     # Script para convertir Excel a JSON
├── leer_excel.py           # Script para analizar el Excel
├── ver_columnas.py         # Script auxiliar
│
├── server.py               # Servidor web simple
├── iniciar.bat             # Inicia el servidor en segundo plano (Windows)
├── detener.bat             # Detiene el servidor (Windows)
└── README.md               # Este archivo
```

## Instalación y Uso

### Requisitos Previos

- Python 3.7 o superior
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

### Instalación

1. **Clonar o descargar el repositorio**

2. **Instalar dependencias de Python**:
   ```bash
   pip install pandas openpyxl
   ```

3. **Generar el archivo JSON de datos**:
   ```bash
   python convertir_a_json.py
   ``

### Ejecución

#### Opción 1: Inicio Rápido con .bat (Windows - MÁS FÁCIL) ⭐

**Para iniciar la aplicación:**
- Doble clic en `iniciar.bat`
- El servidor se ejecutará en segundo plano
- El navegador se abrirá automáticamente
- La terminal se cerrará sola

**Para detener el servidor:**
- Doble clic en `detener.bat`

> **Nota**: El servidor quedará corriendo en segundo plano. Para detenerlo completamente, usa `detener.bat` o cierra el proceso `pythonw.exe` desde el Administrador de Tareas.

#### Opción 2: Servidor Python Simple

```bash
python server.py
```

Luego abre tu navegador en: `http://localhost:8000`

#### Opción 3: Live Server (VS Code)

Si usas Visual Studio Code:
1. Instala la extensión "Live Server"
2. Click derecho en `index.html`
3. Selecciona "Open with Live Server"

#### Opción 4: Cualquier servidor HTTP

Puedes usar cualquier servidor HTTP estático. Ejemplos:

```bash
# Node.js - http-server
npx http-server -p 8000

# Python 3
python -m http.server 8000
```

## Uso de la Aplicación

### Filtros

1. **Por Técnico**: Selecciona uno o varios técnicos para ver solo sus puntos asignados
2. **Por CDA**: Filtra por centro de costos específico
3. **Por Tipo**: Filtra por tipo de punto (PDV, Oficina, Cajero, etc.)

### Búsqueda

- Usa las cajas de búsqueda en cada sección de filtros para encontrar rápidamente técnicos o CDAs específicos

### Controles del Mapa

- **🎯 Centrar Mapa**: Centra el mapa para mostrar todos los puntos filtrados
- **🗺️ Cambiar Vista**: Alterna entre el mapa estándar y el modo oscuro
- **Zoom**: Usa los controles de zoom o la rueda del ratón
- **Click en Marcador**: Muestra información detallada del punto

### Limpiar Filtros

Haz clic en el botón "Limpiar Filtros" en la parte superior del panel lateral para restablecer todos los filtros.

## Datos

La aplicación carga datos desde `datos_puntos.json`, que se genera a partir de `base de datos cesar.xlsx`.

### Campos Disponibles

- **ZONA**: Zona geográfica
- **CODIGOPV**: Código del punto de venta
- **DIRECCION PDV**: Dirección del punto
- **NOMBREPV**: Nombre del punto
- **CODIGO CENTRO DE COSTO**: Código del CDA
- **NOMBRE DE CENTRO DE COSTO**: Nombre del CDA
- **TIPO**: Tipo de punto (PDV, Oficina, Cajero, etc.)
- **LATITUD**: Coordenada de latitud
- **LONGITUD**: Coordenada de longitud
- **TECNICO ASIGNADO**: Técnico responsable
- **CEDULA**: Cédula del técnico
- **TELEFONO**: Teléfono de contacto
- **EMAIL**: Email de contacto

## Estadísticas

- **Total de Puntos**: 946
- **Técnicos Únicos**: 7
- **CDAs Únicos**: 47

## Personalización

### Cambiar el Centro del Mapa

En `app.js`, modifica la constante `CESAR_CENTER`:

```javascript
const CESAR_CENTER = [9.3, -73.25]; // [latitud, longitud]
```

### Ajustar el Zoom Inicial

```javascript
const DEFAULT_ZOOM = 9; // Valores entre 1 y 20
```

### Personalizar Colores

Los colores se definen en `styles.css` usando variables CSS:

```css
:root {
    --primary: hsl(220, 90%, 56%);
    --secondary: hsl(280, 70%, 60%);
    --accent: hsl(160, 75%, 50%);
    /* ... más colores ... */
}
```

## Compatibilidad de Navegadores

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Soporte

Para reportar problemas o sugerir mejoras, contacta al administrador del sistema.

## Licencia

Uso interno - Todos los derechos reservados

## Créditos

- **Mapas**: OpenStreetMap y CartoDB
- **Librería de Mapas**: Leaflet.js
- **Clustering**: Leaflet.markercluster
- **Fuente**: Google Fonts (Inter)

---

