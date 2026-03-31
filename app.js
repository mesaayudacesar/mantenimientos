// ===== Variables Globales =====
let map;
let markersLayer;
let allPuntos = [];
let filteredPuntos = [];
let selectedTecnicos = new Set();
let selectedCDAs = new Set();
let selectedTipos = new Set();

// Búsqueda global
let searchResults = [];
let currentSearchIndex = 0;

// Estadísticas
let stats = {
    totalPuntos: 0,
    puntosVisibles: 0,
    totalTecnicos: 0,
    totalCDAs: 0
};

// ===== Configuración del Mapa =====
// Coordenadas del centro del Cesar (Valledupar)
const CESAR_CENTER = [10.4631, -73.2532];
const DEFAULT_ZOOM = 10;

// URL de la base de datos en Google Sheets (en formato CSV)
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1UcaJzfkIfTBmyYiDHuZBq0Au1jxIwkHp/export?format=csv';

// ===== Inicialización =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando aplicación del mapa...');

    // Inicializar mapa
    initMap();

    // Cargar datos
    await loadData();

    // Configurar event listeners
    setupEventListeners();

    // Ocultar loader
    hideLoader();
});

// ===== Inicializar Mapa =====
function initMap() {
    // Límites geográficos del departamento del Cesar
    const cesarBounds = L.latLngBounds(
        [7.5, -74.5],  // Esquina suroeste
        [11.0, -72.5]  // Esquina noreste
    );

    // Crear mapa con restricciones
    map = L.map('map', {
        zoomControl: false,
        minZoom: 8,
        maxZoom: 18,
        maxBounds: cesarBounds,
        maxBoundsViscosity: 0.9
    }).setView(CESAR_CENTER, DEFAULT_ZOOM);

    // Agregar controles de zoom a la derecha
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Capa base - OpenStreetMap con mejor visualización
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    });

    // Capa alternativa - CartoDB Positron (clara y limpia)
    const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors, © CARTO'
    });

    // Usar capa clara por defecto
    lightLayer.addTo(map);

    // Guardar las capas para cambiar entre ellas
    window.mapLayers = {
        light: lightLayer,
        osm: osmLayer
    };

    window.currentLayer = 'light';

    // Crear grupo de marcadores con clustering
    markersLayer = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        removeOutsideVisibleBounds: true,
        maxClusterRadius: 60,
        disableClusteringAtZoom: 15,
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let size = 'small';

            if (count > 100) size = 'large';
            else if (count > 20) size = 'medium';

            return L.divIcon({
                html: `<div><span>${count}</span></div>`,
                className: `marker-cluster marker-cluster-${size}`,
                iconSize: L.point(40, 40)
            });
        }
    });

    map.addLayer(markersLayer);

    console.log('✓ Mapa inicializado con límites del Cesar');
}

// ===== Crear Máscara del Cesar =====
function createCesarMask() {
    // Coordenadas aproximadas del polígono del departamento del Cesar
    const cesarPolygon = [
        [10.8, -73.9],   // Noroeste
        [11.0, -73.5],   // Norte
        [10.9, -73.0],   // Noreste
        [10.5, -72.6],   // Este
        [9.8, -72.7],    // Sureste
        [8.5, -73.1],    // Sur
        [7.9, -73.5],    // Suroeste
        [8.2, -74.2],    // Oeste
        [9.0, -74.3],    // Oeste medio
        [10.0, -74.2],   // Noroeste medio
        [10.8, -73.9]    // Cierre
    ];

    // Agregar borde rojo del departamento del Cesar
    L.polygon([cesarPolygon], {
        color: '#dc2626',      // Rojo
        weight: 3,
        fillOpacity: 0,
        interactive: false,
        opacity: 0.8,
        className: 'cesar-border'
    }).addTo(map);

    console.log('✓ Borde del Cesar aplicado');
}

// ===== Cargar Datos =====
async function loadData() {
    try {
        console.log('Cargando datos desde Google Sheets...');
        const response = await fetch(GOOGLE_SHEETS_URL);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const dataBuffer = await response.arrayBuffer();

        // Usar TextDecoder para asegurar que los bytes se interpreten como UTF-8
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(dataBuffer);

        // Leer el CSV como string con la codificación correcta
        const workbook = XLSX.read(csvText, { type: 'string' });

        // Asumiendo que los datos están en la primera pestaña
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const rawPuntos = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",           // Valor por defecto para celdas vacías
            raw: false,          // Forzar que todos los valores sean strings
            blankrows: false
        });

        // Normalizar nombres de columnas, valores Unicode y filtrar puntos inválidos
        allPuntos = rawPuntos.map(rp => {
            const normalizedPunto = {};
            Object.keys(rp).forEach(key => {
                // Normalizar clave: trim y colapsar múltiples espacios a uno solo
                const normalizedKey = key.trim().replace(/\s+/g, ' ');
                // Normalizar el valor: asegurar que sea string y normalizar Unicode
                let value = rp[key];
                if (typeof value === 'string') {
                    // Normalizar Unicode (NFKC) para asegurar que los caracteres se manejen correctamente
                    value = value.normalize('NFKC');
                }
                normalizedPunto[normalizedKey] = value;
            });
            return normalizedPunto;
        }).filter(punto => {
            const lat = parseFloat(punto.LATITUD);
            const lng = parseFloat(punto.LONGITUD);
            return !isNaN(lat) && !isNaN(lng);
        });

        filteredPuntos = [...allPuntos];

        console.log(`✓ Cargados ${allPuntos.length} puntos válidos desde Google Sheets`);

        // Procesar datos
        processData();

        // Actualizar UI
        updateStats();
        renderFilters();
        renderMarkers();

    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar los datos desde Google Sheets. Por favor, verifica tu conexión a internet.');
    }
}

// ===== Procesar Datos =====
function processData() {
    // Cargar datos de mantenimiento (async)
    loadMantenimientoData().then(() => {
        // Renderizar marcadores de nuevo una vez cargados los datos de mantenimiento
        renderMarkers();
        renderMantenimientoFilter();
    });

    // Obtener valores únicos
    const tecnicos = new Set();
    const cdas = new Set();
    const tipos = new Set();

    allPuntos.forEach(punto => {
        if (punto['TECNICO ASIGNADO']) tecnicos.add(punto['TECNICO ASIGNADO'].trim());
        if (punto['NOMBRE DE CENTRO DE COSTO']) cdas.add(punto['NOMBRE DE CENTRO DE COSTO'].trim());
        if (punto['TIPO']) tipos.add(punto['TIPO'].trim());
    });

    // Guardar estadísticas
    stats.totalPuntos = allPuntos.length;
    stats.totalTecnicos = tecnicos.size;
    stats.totalCDAs = cdas.size;

    // Almacenar para filtros
    window.uniqueTecnicos = Array.from(tecnicos).filter(t => t).sort();
    window.uniqueCDAs = Array.from(cdas).filter(c => c).sort();
    window.uniqueTipos = Array.from(tipos).filter(t => t).sort();

    console.log('✓ Datos procesados:', {
        puntos: stats.totalPuntos,
        tecnicos: stats.totalTecnicos,
        cdas: stats.totalCDAs,
        tipos: window.uniqueTipos.length
    });
}

// ===== Actualizar Estadísticas =====
function updateStats() {
    stats.puntosVisibles = filteredPuntos.length;

    document.getElementById('total-puntos').textContent = formatNumber(stats.totalPuntos);
    document.getElementById('puntos-visibles').textContent = formatNumber(stats.puntosVisibles);
    document.getElementById('total-tecnicos').textContent = formatNumber(stats.totalTecnicos);
    document.getElementById('total-cdas').textContent = formatNumber(stats.totalCDAs);
}

// ===== Renderizar Filtros =====
function renderFilters() {
    renderTecnicosFilter();
    renderCDAsFilter();
    renderTiposFilter();
    renderMantenimientoFilter();
}

function renderTecnicosFilter() {
    const container = document.getElementById('tecnicos-list');
    container.innerHTML = '';

    // Contar puntos por técnico
    const counts = {};
    allPuntos.forEach(punto => {
        const tecnico = punto['TECNICO ASIGNADO']?.trim();
        if (tecnico) {
            counts[tecnico] = (counts[tecnico] || 0) + 1;
        }
    });

    // Crear elementos de filtro
    window.uniqueTecnicos.forEach(tecnico => {
        const item = createFilterItem(tecnico, counts[tecnico] || 0, 'tecnico');
        container.appendChild(item);
    });

    document.getElementById('tecnicos-count').textContent = window.uniqueTecnicos.length;
}

function renderCDAsFilter() {
    const container = document.getElementById('cdas-list');
    container.innerHTML = '';

    // Contar puntos por CDA
    const counts = {};
    allPuntos.forEach(punto => {
        const cda = punto['NOMBRE DE CENTRO DE COSTO']?.trim();
        if (cda) {
            counts[cda] = (counts[cda] || 0) + 1;
        }
    });

    // Crear elementos de filtro
    window.uniqueCDAs.forEach(cda => {
        const item = createFilterItem(cda, counts[cda] || 0, 'cda');
        container.appendChild(item);
    });

    document.getElementById('cdas-count').textContent = window.uniqueCDAs.length;
}

function renderTiposFilter() {
    const container = document.getElementById('tipos-list');
    container.innerHTML = '';

    // Contar puntos por tipo
    const counts = {};
    allPuntos.forEach(punto => {
        const tipo = punto['TIPO']?.trim();
        if (tipo) {
            counts[tipo] = (counts[tipo] || 0) + 1;
        }
    });

    // Crear elementos de filtro
    window.uniqueTipos.forEach(tipo => {
        const item = createFilterItem(tipo, counts[tipo] || 0, 'tipo');
        container.appendChild(item);
    });

    document.getElementById('tipos-count').textContent = window.uniqueTipos.length;
}

function createFilterItem(value, count, type) {
    const div = document.createElement('div');
    div.className = 'filter-item';
    div.dataset.value = value;
    div.dataset.type = type;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}-${value}`;
    checkbox.addEventListener('change', (e) => handleFilterChange(type, value, e.target.checked));

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = value;

    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = count;

    div.appendChild(checkbox);
    div.appendChild(label);
    div.appendChild(countSpan);

    return div;
}

// ===== Manejar Cambios de Filtro =====
function handleFilterChange(type, value, checked) {
    const filterItem = document.querySelector(`.filter-item[data-value="${value}"][data-type="${type}"]`);

    if (checked) {
        filterItem.classList.add('active');

        switch (type) {
            case 'tecnico':
                selectedTecnicos.add(value);
                break;
            case 'cda':
                selectedCDAs.add(value);
                break;
            case 'tipo':
                selectedTipos.add(value);
                break;
            case 'mantenimiento':
                selectedMantenimiento.add(value);
                break;
        }
    } else {
        filterItem.classList.remove('active');

        switch (type) {
            case 'tecnico':
                selectedTecnicos.delete(value);
                break;
            case 'cda':
                selectedCDAs.delete(value);
                break;
            case 'tipo':
                selectedTipos.delete(value);
                break;
            case 'mantenimiento':
                selectedMantenimiento.delete(value);
                break;
        }
    }

    applyFilters();
}

// ===== Aplicar Filtros =====
function applyFilters() {
    filteredPuntos = allPuntos.filter(punto => {
        // Filtro de técnicos
        if (selectedTecnicos.size > 0) {
            const tecnico = punto['TECNICO ASIGNADO']?.trim();
            if (!tecnico || !selectedTecnicos.has(tecnico)) {
                return false;
            }
        }

        // Filtro de CDAs
        if (selectedCDAs.size > 0) {
            const cda = punto['NOMBRE DE CENTRO DE COSTO']?.trim();
            if (!cda || !selectedCDAs.has(cda)) {
                return false;
            }
        }

        // Filtro de tipos
        if (selectedTipos.size > 0) {
            const tipo = punto['TIPO']?.trim();
            if (!tipo || !selectedTipos.has(tipo)) {
                return false;
            }
        }

        // Filtro de mantenimiento (funciona como OR: mostrar puntos que cumplan al menos una condición)
        if (selectedMantenimiento.size > 0) {
            const mantenimiento = getPuntoMantenimiento(punto.CODIGOPV);
            const tieneMantenimiento = mantenimiento.realizado;

            const cumpleFiltro =
                (selectedMantenimiento.has('con-mantenimiento') && tieneMantenimiento) ||
                (selectedMantenimiento.has('sin-mantenimiento') && !tieneMantenimiento);

            if (!cumpleFiltro) {
                return false;
            }
        }

        return true;
    });

    console.log(`Filtros aplicados: ${filteredPuntos.length} de ${allPuntos.length} puntos`);

    updateStats();

    // Primero renderizar los marcadores
    renderMarkers();

    // Luego centrar el mapa con animación
    setTimeout(() => {
        centerMapToFilteredPoints();
        // Invalidar el tamaño del mapa después de la animación para asegurar que se rendericen todos los marcadores
        setTimeout(() => {
            map.invalidateSize();
        }, 1600);
    }, 100);
}

// ===== Renderizar Marcadores =====
function renderMarkers() {
    // Limpiar marcadores existentes
    markersLayer.clearLayers();

    // Agregar nuevos marcadores
    filteredPuntos.forEach(punto => {
        const lat = parseFloat(punto.LATITUD);
        const lng = parseFloat(punto.LONGITUD);

        // Validar coordenadas
        if (isNaN(lat) || isNaN(lng)) {
            return;
        }

        // Crear marcador
        const marker = L.marker([lat, lng], {
            icon: createCustomIcon(punto)
        });

        // Agregar popup
        marker.bindPopup(createPopupContent(punto), {
            maxWidth: 350,
            className: 'custom-popup'
        });

        // Agregar al layer
        markersLayer.addLayer(marker);
    });

    console.log(`✓ ${filteredPuntos.length} marcadores renderizados`);
}

// ===== Crear Ícono Personalizado =====
function createCustomIcon(punto) {
    const tipo = punto.TIPO || punto; // Soportar tanto punto completo como tipo solo
    const codigoPV = punto.CODIGOPV || null;

    // Determinar si es un Centro de Costos (CDA) basado en el tipo
    const tipoUpper = tipo?.trim().toUpperCase();
    const isCDA = tipoUpper === 'CDA' || tipoUpper === 'CENTRO DE COSTOS';

    // Verificar si tiene mantenimiento
    const mantenimiento = codigoPV ? getPuntoMantenimiento(codigoPV) : { realizado: false };
    const tieneMantenimiento = mantenimiento.realizado;

    // Configuración de iconos con tamaños diferenciados
    const tipoConfig = {
        'CDA': {
            color: '#8b5cf6',
            icon: 'fa-building',
            size: 40,  // Más grande para CDAs
            iconSize: 18
        },
        'CENTRO DE COSTOS': {
            color: '#8b5cf6',
            icon: 'fa-building',
            size: 40,
            iconSize: 18
        },
        'PDV': {
            color: '#3b82f6',
            icon: 'fa-store',
            size: 32,  // Tamaño estándar para PDV
            iconSize: 14
        },
        'OFICINA': {
            color: '#6366f1',
            icon: 'fa-briefcase',
            size: 32,
            iconSize: 14
        },
        'CAJERO': {
            color: '#10b981',
            icon: 'fa-credit-card',
            size: 32,
            iconSize: 14
        },
        'DEFAULT': {
            color: '#f59e0b',
            icon: 'fa-map-marker-alt',
            size: 32,
            iconSize: 14
        }
    };

    const config = tipoConfig[tipoUpper] || tipoConfig.DEFAULT;

    // Agregar estrella dorada si tiene mantenimiento
    const maintenanceBadge = tieneMantenimiento ?
        `<div class="maintenance-badge"><i class="fas fa-star"></i></div>` : '';

    const iconHtml = `
        <div class="custom-marker ${isCDA ? 'cda-marker' : ''}" style="background-color: ${config.color}; width: ${config.size}px; height: ${config.size}px; position: relative;">
            <i class="fas ${config.icon}" style="font-size: ${config.iconSize}px;"></i>
            ${maintenanceBadge}
        </div>
    `;

    return L.divIcon({
        html: iconHtml,
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size],
        popupAnchor: [0, -config.size],
        className: 'custom-marker-icon'
    });
}

// ===== Crear Contenido del Popup =====
function createPopupContent(punto) {
    // Determinar el icono y color según el tipo
    const tipoIcons = {
        'PDV': { icon: 'fa-store', color: '#3b82f6' },
        'OFICINA': { icon: 'fa-building', color: '#8b5cf6' },
        'CAJERO': { icon: 'fa-credit-card', color: '#10b981' }
    };

    const tipoUpper = punto.TIPO?.trim().toUpperCase();
    const tipoConfig = tipoIcons[tipoUpper] || { icon: 'fa-map-marker-alt', color: '#f59e0b' };

    // Obtener información de mantenimiento
    const mantenimiento = getPuntoMantenimiento(punto.CODIGOPV);
    const tieneMantenimiento = mantenimiento.realizado;

    // Crear badge de estado de mantenimiento
    const maintenanceStatusHtml = tieneMantenimiento ? `
        <div class="maintenance-status completed">
            <i class="fas fa-star"></i>
            <span>Mantenimiento Realizado</span>
        </div>
        <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-secondary);">
            <div><strong>Ticket:</strong> ${mantenimiento.numeroTicket}</div>
            <div><strong>Fecha:</strong> ${new Date(mantenimiento.fechaMantenimiento + 'T00:00:00').toLocaleDateString('es-CO')}</div>
        </div>
    ` : `
        <div class="maintenance-status pending">
            <i class="fas fa-exclamation-circle"></i>
            <span>Sin Mantenimiento</span>
        </div>
    `;

    return `
        <div class="popup-content">
            <div class="popup-header">
                <i class="fas ${tipoConfig.icon}" style="color: ${tipoConfig.color};"></i>
                <h3>${punto.NOMBREPV || 'Sin nombre'}</h3>
            </div>
            
            <div class="popup-body">
                <div class="info-row">
                    <i class="fas fa-hashtag"></i>
                    <span class="info-label">Código:</span>
                    <span class="info-value">${punto.CODIGOPV || 'N/A'}</span>
                </div>
                
                <div class="info-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="info-label">Dirección:</span>
                    <span class="info-value">${punto['DIRECCION PDV'] || 'N/A'}</span>
                </div>
                
                <div class="info-row">
                    <i class="fas fa-tag"></i>
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">${punto.TIPO || 'N/A'}</span>
                </div>
                
                <div class="info-row">
                    <i class="fas fa-building"></i>
                    <span class="info-label">CDA:</span>
                    <span class="info-value">${punto['NOMBRE DE CENTRO DE COSTO'] || 'N/A'}</span>
                </div>
                
                <div class="info-row">
                    <i class="fas fa-user-tie"></i>
                    <span class="info-label">Técnico:</span>
                    <span class="info-value">${punto['TECNICO ASIGNADO'] || 'No asignado'}</span>
                </div>
                
                ${punto.TELEFONO ? `
                <div class="info-row">
                    <i class="fas fa-phone"></i>
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value"><a href="tel:${punto.TELEFONO}">${punto.TELEFONO}</a></span>
                </div>
                ` : ''}
                
                ${punto.EMAIL ? `
                <div class="info-row">
                    <i class="fas fa-envelope"></i>
                    <span class="info-label">Email:</span>
                    <span class="info-value"><a href="mailto:${punto.EMAIL}">${punto.EMAIL}</a></span>
                </div>
                ` : ''}
                
                <hr style="margin: 12px 0; border: none; border-top: 1px solid var(--border-color);">
                
                ${maintenanceStatusHtml}

                <div class="popup-actions">
                    <button class="btn-edit-maintenance" onclick="openMantenimientoModal(${JSON.stringify(punto).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                        Editar Mantenimiento
                    </button>
                    <button class="btn-compartir-ubicacion" onclick="compartirUbicacion(${punto.LATITUD}, ${punto.LONGITUD}, '${(punto.NOMBREPV || '').replace(/'/g, "\\'")}')"
                        title="Copiar enlace de Google Maps">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Botón de reset
    document.getElementById('btn-reset').addEventListener('click', resetFilters);

    // Búsqueda global
    const searchGlobalInput = document.getElementById('search-global');
    console.log('🔍 Configurando búsqueda global. Input encontrado:', !!searchGlobalInput);

    if (searchGlobalInput) {
        searchGlobalInput.addEventListener('input', (e) => {
            console.log('⌨️ Evento input detectado en búsqueda global');
            handleGlobalSearch(e.target.value);
        });
        console.log('✅ Event listener de búsqueda global configurado');
    } else {
        console.error('❌ No se encontró el input de búsqueda global');
    }

    // Búsqueda de técnicos
    document.getElementById('search-tecnico').addEventListener('input', (e) => {
        filterSearchList(e.target.value, 'tecnicos-list');
    });

    // Búsqueda de CDAs
    document.getElementById('search-cda').addEventListener('input', (e) => {
        filterSearchList(e.target.value, 'cdas-list');
    });

    // Navegación de búsqueda global
    document.getElementById('prev-result').addEventListener('click', previousSearchResult);
    document.getElementById('next-result').addEventListener('click', nextSearchResult);

    // Toggle sidebar
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);

    // Centrar mapa
    document.getElementById('btn-center').addEventListener('click', centerMap);

    // Cambiar capa del mapa
    document.getElementById('btn-layers').addEventListener('click', toggleMapLayer);

    // Colapsar/Expandir filtros
    document.querySelectorAll('.filter-header[data-filter]').forEach(header => {
        header.addEventListener('click', function () {
            const filterName = this.dataset.filter;
            const content = document.getElementById(`${filterName}-content`);

            // Toggle collapsed
            content.classList.toggle('collapsed');
            this.classList.toggle('collapsed');

            console.log(`✓ Filtro ${filterName} ${content.classList.contains('collapsed') ? 'colapsado' : 'expandido'}`);
        });
    });

    // Configurar modal de mantenimiento
    setupMantenimientoModalListeners();

    // Botón de exportación de mantenimiento
    const btnExport = document.getElementById('btn-export-mantenimiento');
    if (btnExport) {
        btnExport.addEventListener('click', exportarMantenimientos);
    }
}

// ===== Resetear Filtros =====
function resetFilters() {
    // Limpiar selecciones
    selectedTecnicos.clear();
    selectedCDAs.clear();
    selectedTipos.clear();
    selectedMantenimiento.clear();

    // Desmarcar checkboxes
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Remover clase active
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.remove('active');
    });

    // Limpiar búsquedas
    document.getElementById('search-tecnico').value = '';
    document.getElementById('search-cda').value = '';
    document.getElementById('search-global').value = '';

    // Limpiar resultados de búsqueda global
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-navigation').style.display = 'none';
    searchResults = [];
    currentSearchIndex = 0;

    // Mostrar todos los items
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.remove('hidden');
    });

    // Aplicar filtros (mostrar todo)
    applyFilters();

    console.log('✓ Filtros reseteados');
}

// ===== Búsqueda Global =====
function handleGlobalSearch(searchTerm) {
    console.log('🔍 handleGlobalSearch llamada con:', searchTerm);

    const resultsContainer = document.getElementById('search-results');
    const navigationContainer = document.getElementById('search-navigation');
    console.log(' Contenedor de resultados:', resultsContainer);

    const term = searchTerm.trim().toLowerCase();
    console.log(' Término de búsqueda procesado:', term, 'Longitud:', term.length);

    // Limpiar si el término está vacío
    if (term.length < 2) {
        resultsContainer.innerHTML = '';
        navigationContainer.style.display = 'none';
        searchResults = [];
        currentSearchIndex = 0;
        console.log('⚠️ Término muy corto, limpiando resultados');
        return;
    }

    console.log('🔎 Buscando en', allPuntos.length, 'puntos...');

    // Buscar en todos los puntos (sin límite)
    const normalizedTerm = normalizeString(term);

    searchResults = allPuntos.filter(punto => {
        const nombre = normalizeString(punto.NOMBREPV || '');
        const codigo = normalizeString(punto.CODIGOPV || '');

        return nombre.includes(normalizedTerm) || codigo.includes(normalizedTerm);
    });

    console.log(`✅ ${searchResults.length} resultados encontrados`);

    // Mostrar resultados
    if (searchResults.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: var(--spacing-md); text-align: center; color: var(--text-secondary);">No se encontraron resultados</div>';
        navigationContainer.style.display = 'none';
        console.log('❌ No se encontraron resultados');
        return;
    }

    // Mostrar controles de navegación
    navigationContainer.style.display = 'flex';
    currentSearchIndex = 0;
    updateSearchNavigation();

    // Renderizar lista de resultados
    renderSearchResults();

    // Navegar automáticamente al primer resultado
    navigateToSearchResult(0);

    console.log(`✓ Búsqueda global: ${searchResults.length} resultados para "${searchTerm}"`);
}

// ===== Renderizar Resultados de Búsqueda =====
function renderSearchResults() {
    const resultsContainer = document.getElementById('search-results');

    resultsContainer.innerHTML = searchResults.map((punto, index) => `
        <div class="search-result-item ${index === currentSearchIndex ? 'active' : ''}" data-index="${index}">
            <div class="result-name">${punto.NOMBREPV || 'Sin nombre'}</div>
            <div class="result-code">Código: ${punto.CODIGOPV || 'N/A'}</div>
            <span class="result-type">${punto.TIPO || 'N/A'}</span>
        </div>
    `).join('');

    // Agregar event listeners a los resultados
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', function () {
            const index = parseInt(this.dataset.index);
            navigateToSearchResult(index);
        });
    });

    console.log('📄 HTML de resultados generado con', searchResults.length, 'items');
}

// ===== Navegar a un Resultado Específico =====
function navigateToSearchResult(index) {
    if (index < 0 || index >= searchResults.length) return;

    currentSearchIndex = index;
    const punto = searchResults[index];

    const lat = parseFloat(punto.LATITUD);
    const lng = parseFloat(punto.LONGITUD);

    if (!isNaN(lat) && !isNaN(lng)) {
        console.log('🗺️ Navegando al punto:', lat, lng, '-', punto.NOMBREPV);

        // Hacer zoom al punto seleccionado con animación
        map.flyTo([lat, lng], 16, {
            duration: 1.5,
            easeLinearity: 0.25
        });

        // Resaltar el marcador (abrir popup)
        markersLayer.eachLayer(layer => {
            const latlng = layer.getLatLng();
            if (latlng.lat === lat && latlng.lng === lng) {
                setTimeout(() => {
                    layer.openPopup();
                }, 1600);
            }
        });
    }

    // Actualizar UI
    updateSearchNavigation();
    updateActiveResultItem();
}

// ===== Actualizar Controles de Navegación =====
function updateSearchNavigation() {
    const counter = document.getElementById('search-counter');
    const prevBtn = document.getElementById('prev-result');
    const nextBtn = document.getElementById('next-result');

    if (!counter || !prevBtn || !nextBtn) return;

    // Actualizar contador
    counter.textContent = `${currentSearchIndex + 1} / ${searchResults.length}`;

    // Habilitar/deshabilitar botones
    prevBtn.disabled = currentSearchIndex === 0;
    nextBtn.disabled = currentSearchIndex === searchResults.length - 1;
}

// ===== Actualizar Item Activo en la Lista =====
function updateActiveResultItem() {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    // Remover clase active de todos los items
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.classList.remove('active');
    });

    // Agregar clase active al item actual
    const activeItem = resultsContainer.querySelector(`[data-index="${currentSearchIndex}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        // Hacer scroll para que el item activo sea visible
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ===== Navegación: Resultado Anterior =====
function previousSearchResult() {
    if (currentSearchIndex > 0) {
        navigateToSearchResult(currentSearchIndex - 1);
    }
}

// ===== Navegación: Siguiente Resultado =====
function nextSearchResult() {
    if (currentSearchIndex < searchResults.length - 1) {
        navigateToSearchResult(currentSearchIndex + 1);
    }
}

// ===== Filtrar Lista de Búsqueda =====
function filterSearchList(searchTerm, listId) {
    const list = document.getElementById(listId);
    const items = list.querySelectorAll('.filter-item');
    const term = normalizeString(searchTerm);

    items.forEach(item => {
        const label = normalizeString(item.querySelector('label').textContent);
        if (label.includes(term)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// ===== Toggle Sidebar =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');

    // Ajustar posición del botón toggle
    const toggle = document.getElementById('sidebar-toggle');

    // Invalidar tamaño del mapa después de la animación
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// ===== Centrar Mapa en Puntos Filtrados =====
function centerMapToFilteredPoints() {
    if (filteredPuntos.length === 0) {
        // Si no hay puntos filtrados, volver al centro del Cesar
        map.flyTo(CESAR_CENTER, DEFAULT_ZOOM, {
            duration: 1.5,
            easeLinearity: 0.25
        });
        return;
    }

    // Obtener bounds de los puntos visibles
    const validCoords = filteredPuntos
        .map(p => [parseFloat(p.LATITUD), parseFloat(p.LONGITUD)])
        .filter(coords => !isNaN(coords[0]) && !isNaN(coords[1]));

    if (validCoords.length === 0) return;

    if (validCoords.length === 1) {
        // Si solo hay un punto, hacer zoom a ese punto
        map.flyTo(validCoords[0], 15, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    } else {
        // Si hay múltiples puntos, ajustar bounds con animación
        const bounds = L.latLngBounds(validCoords);
        map.flyToBounds(bounds, {
            padding: [50, 50],
            duration: 1.5,
            easeLinearity: 0.25,
            maxZoom: 14
        });
    }

    console.log(`✓ Mapa centrado en ${filteredPuntos.length} punto(s) filtrado(s)`);
}

// ===== Centrar Mapa =====
function centerMap() {
    if (filteredPuntos.length === 0) {
        map.setView(CESAR_CENTER, DEFAULT_ZOOM);
        return;
    }

    // Obtener bounds de los puntos visibles
    const bounds = L.latLngBounds(
        filteredPuntos.map(p => [parseFloat(p.LATITUD), parseFloat(p.LONGITUD)])
            .filter(coords => !isNaN(coords[0]) && !isNaN(coords[1]))
    );

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ===== Cambiar Capa del Mapa =====
function toggleMapLayer() {
    if (window.currentLayer === 'light') {
        map.removeLayer(window.mapLayers.light);
        map.addLayer(window.mapLayers.osm);
        window.currentLayer = 'osm';
    } else {
        map.removeLayer(window.mapLayers.osm);
        map.addLayer(window.mapLayers.light);
        window.currentLayer = 'light';
    }

    console.log(`✓ Capa cambiada a: ${window.currentLayer}`);
}

// ===== Utilidades =====
function formatNumber(num) {
    return num.toLocaleString('es-CO');
}

/**
 * Normaliza un string: lo pasa a minúsculas, elimina espacios extra y quita acentos.
 * @param {string} str - El string a normalizar
 * @returns {string} - El string normalizado
 */
function normalizeString(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ""); // Elimina marcas de acento
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
}

// ===== Sistema de Mantenimiento Preventivo =====
// Variables globales para mantenimiento
let selectedMantenimiento = new Set(); // Para filtros de mantenimiento
let mantenimientoData = {}; // Almacena datos de mantenimiento
let currentEditingPunto = null; // Punto que se está editando

// Cargar datos de mantenimiento desde el servidor (API REST → SQLite)
async function loadMantenimientoData() {
    try {
        console.log('⌛ Cargando mantenimientos desde el servidor...');
        const respuesta = await fetch('/api/mantenimientos');
        if (respuesta.ok) {
            mantenimientoData = await respuesta.json();
            const count = Object.keys(mantenimientoData).length;
            console.log('✅ Datos de mantenimiento cargados:', count, 'puntos');
            if (count === 0) {
                console.warn('⚠️ No se recibieron registros de mantenimiento del servidor.');
            }
        } else {
            const errorText = await respuesta.text();
            console.error('❌ Error al cargar mantenimientos:', respuesta.status, errorText);
            mantenimientoData = {};
        }
    } catch (error) {
        console.error('Error al cargar datos de mantenimiento:', error);
        mantenimientoData = {};
    }
}

// Guardar un mantenimiento individual en el servidor (API REST → SQLite)
async function guardarMantenimientoEnServidor(codigoPV, datos) {
    try {
        const respuesta = await fetch('/api/mantenimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigoPV: codigoPV,
                realizado: datos.realizado,
                numeroTicket: datos.numeroTicket || '',
                fechaMantenimiento: datos.fechaMantenimiento || ''
            })
        });

        if (respuesta.ok) {
            console.log('☁️ Mantenimiento guardado en servidor:', codigoPV);
        } else {
            console.error('❌ Error al guardar en servidor:', respuesta.status);
        }
    } catch (error) {
        console.error('❌ Error de conexión al servidor:', error);
    }
}

// Obtener datos de mantenimiento de un punto
function getPuntoMantenimiento(codigoPV) {
    if (!codigoPV) return { realizado: false, numeroTicket: '', fechaMantenimiento: '' };
    
    // Normalizar a string para asegurar coincidencia con las llaves del JSON
    const id = String(codigoPV);
    return mantenimientoData[id] || {
        realizado: false,
        numeroTicket: '',
        fechaMantenimiento: ''
    };
}

// Actualizar datos de mantenimiento de un punto y guardar en el servidor
function updatePuntoMantenimiento(codigoPV, data) {
    const datosMantenimiento = {
        realizado: data.realizado,
        numeroTicket: data.numeroTicket || '',
        fechaMantenimiento: data.fechaMantenimiento || ''
    };
    // Actualizar la caché local en memoria
    mantenimientoData[codigoPV] = datosMantenimiento;
    // Persistir en el servidor vía API REST (SQLite)
    guardarMantenimientoEnServidor(codigoPV, datosMantenimiento);
    console.log(`✓ Mantenimiento actualizado para punto ${codigoPV}`);
}

// Abrir modal de mantenimiento
function openMantenimientoModal(punto) {
    currentEditingPunto = punto;
    const modal = document.getElementById('modal-mantenimiento');
    const mantenimiento = getPuntoMantenimiento(punto.CODIGOPV);

    // Llenar información del punto
    document.getElementById('modal-punto-nombre').textContent = punto.NOMBREPV || 'Sin nombre';
    document.getElementById('modal-punto-codigo').textContent = punto.CODIGOPV || 'N/A';

    // Llenar datos de mantenimiento
    const checkboxRealizado = document.getElementById('modal-mantenimiento-realizado');
    const inputTicket = document.getElementById('modal-numero-ticket');
    const inputFecha = document.getElementById('modal-fecha-mantenimiento');
    const ticketGroup = document.getElementById('ticket-group');
    const fechaGroup = document.getElementById('fecha-group');

    checkboxRealizado.checked = mantenimiento.realizado;
    inputTicket.value = mantenimiento.numeroTicket || '';
    inputFecha.value = mantenimiento.fechaMantenimiento || '';

    // Mostrar/ocultar campos según el estado del checkbox
    if (mantenimiento.realizado) {
        ticketGroup.style.display = 'block';
        fechaGroup.style.display = 'block';
    } else {
        ticketGroup.style.display = 'none';
        fechaGroup.style.display = 'none';
    }

    // Mostrar modal con animación
    modal.classList.add('show');

    // Auto-focus en el input de ticket si está activado
    if (mantenimiento.realizado) {
        setTimeout(() => inputTicket.focus(), 300);
    }
}

// Cerrar modal de mantenimiento
function closeMantenimientoModal() {
    const modal = document.getElementById('modal-mantenimiento');
    modal.classList.remove('show');
    currentEditingPunto = null;
}

// Guardar mantenimiento
function guardarMantenimiento() {
    if (!currentEditingPunto) return;

    const checkboxRealizado = document.getElementById('modal-mantenimiento-realizado');
    const inputTicket = document.getElementById('modal-numero-ticket');
    const inputFecha = document.getElementById('modal-fecha-mantenimiento');

    const realizado = checkboxRealizado.checked;
    const numeroTicket = inputTicket.value.trim();
    const fechaMantenimiento = inputFecha.value;

    // Validar: si está realizado, debe tener número de ticket y fecha
    if (realizado && (!numeroTicket || !fechaMantenimiento)) {
        alert('Por favor, ingresa el número de ticket y la fecha de mantenimiento');
        return;
    }

    // Actualizar datos
    updatePuntoMantenimiento(currentEditingPunto.CODIGOPV, {
        realizado,
        numeroTicket,
        fechaMantenimiento
    });

    // Cerrar modal
    closeMantenimientoModal();

    // Actualizar visualización
    renderMarkers();
    renderMantenimientoFilter();

    console.log('✓ Mantenimiento guardado exitosamente');
}

// Renderizar filtro de mantenimiento
function renderMantenimientoFilter() {
    const container = document.getElementById('mantenimiento-list');
    if (!container) return;

    container.innerHTML = '';

    // Contar puntos con y sin mantenimiento
    let conMantenimiento = 0;
    let sinMantenimiento = 0;

    allPuntos.forEach(punto => {
        const mantenimiento = getPuntoMantenimiento(punto.CODIGOPV);
        if (mantenimiento.realizado) {
            conMantenimiento++;
        } else {
            sinMantenimiento++;
        }
    });

    // Crear opciones de filtro con el valor correcto como identificador
    const opciones = [
        { value: 'con-mantenimiento', label: 'Con Mantenimiento', count: conMantenimiento },
        { value: 'sin-mantenimiento', label: 'Sin Mantenimiento', count: sinMantenimiento }
    ];

    opciones.forEach(opcion => {
        // Crear el item del filtro usando el valor real, no el label
        const item = createMantenimientoFilterItem(opcion.value, opcion.label, opcion.count);
        container.appendChild(item);
    });

    document.getElementById('mantenimiento-count').textContent = '2';
}

// Crear item de filtro específico para mantenimiento (usa value como identificador)
function createMantenimientoFilterItem(value, label, count) {
    const div = document.createElement('div');
    div.className = 'filter-item';
    div.dataset.value = value;
    div.dataset.type = 'mantenimiento';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `mantenimiento-${value}`;
    // Usar el value correcto (con-mantenimiento/sin-mantenimiento) en el evento
    checkbox.addEventListener('change', (e) => handleFilterChange('mantenimiento', value, e.target.checked));

    const labelEl = document.createElement('label');
    labelEl.htmlFor = checkbox.id;
    labelEl.textContent = label;

    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = count;

    div.appendChild(checkbox);
    div.appendChild(labelEl);
    div.appendChild(countSpan);

    return div;
}

// Configurar event listeners del modal
function setupMantenimientoModalListeners() {
    const modal = document.getElementById('modal-mantenimiento');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const btnGuardar = document.getElementById('btn-guardar-mantenimiento');
    const checkboxRealizado = document.getElementById('modal-mantenimiento-realizado');

    // Cerrar modal
    btnClose.addEventListener('click', closeMantenimientoModal);
    btnCancelar.addEventListener('click', closeMantenimientoModal);

    // Cerrar al hacer clic fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMantenimientoModal();
        }
    });

    // Guardar
    btnGuardar.addEventListener('click', guardarMantenimiento);

    // Mostrar/ocultar campos según el checkbox
    checkboxRealizado.addEventListener('change', (e) => {
        const ticketGroup = document.getElementById('ticket-group');
        const fechaGroup = document.getElementById('fecha-group');
        const inputTicket = document.getElementById('modal-numero-ticket');

        if (e.target.checked) {
            ticketGroup.style.display = 'block';
            fechaGroup.style.display = 'block';
            setTimeout(() => inputTicket.focus(), 100);
        } else {
            ticketGroup.style.display = 'none';
            fechaGroup.style.display = 'none';
        }
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeMantenimientoModal();
        }
    });

    console.log('✓ Event listeners del modal configurados');
}



// Función para exportar mantenimientos a Excel (.xlsx)
function exportarMantenimientos() {
    // 1. Obtener puntos con mantenimiento realizado
    const puntosConMantenimiento = allPuntos.filter(punto => {
        const mant = getPuntoMantenimiento(punto.CODIGOPV);
        return mant && mant.realizado;
    });

    if (puntosConMantenimiento.length === 0) {
        alert('No hay puntos con mantenimiento realizado para exportar.');
        return;
    }

    // 2. Definir centros de costo de Valledupar
    const centrosValledupar = [
        'VALLEDUPAR AMBULANTE',
        'VALLEDUPAR AV LOS MILITARES',
        'VALLEDUPAR BELLA VISTA',
        'VALLEDUPAR FUNDADORES',
        'VALLEDUPAR LA CANDELARIA',
        'VALLEDUPAR LA CUARTA',
        'VALLEDUPAR LANEVADA',
        'VALLEDUPAR LOPERENA',
        'VALLEDUPAR ORBICENTRO',
        'VALLEDUPAR PEDIATRICO',
        'VALLEDUPAR PRINCIPAL',
        'VALLEDUPAR SIERRA NEVADA',
        'VALLEDUPAR SIMON BOLIVAR 7D',
        'VALLEDUPAR TERMINAL',
        'VALLEDUPAR TERMINAL 2'
    ];

    // 3. Preparar los datos para el Excel
    const data = puntosConMantenimiento.map(punto => {
        const mant = getPuntoMantenimiento(punto.CODIGOPV);
        // Determinar municipio
        const cda = (punto['NOMBRE DE CENTRO DE COSTO'] || 'SIN ESPECIFICAR').trim().toUpperCase();
        let municipio = cda;

        // Regla para Valledupar
        if (centrosValledupar.some(c => cda.includes(c))) {
            municipio = 'VALLEDUPAR';
        }
        // Regla para Bosconia
        else if (cda.includes('BOSCONIA')) {
            municipio = 'BOSCONIA';
        }

        return {
            'Código PV': punto.CODIGOPV || '',
            'Nombre Punto': punto.NOMBREPV || '',
            'Dirección': punto['DIRECCION PDV'] || '',
            'Centro de Costo': punto['NOMBRE DE CENTRO DE COSTO'] || '',
            'Municipio': municipio,
            'Técnico Asignado': punto['TECNICO ASIGNADO'] || '',
            'Número de Ticket': mant.numeroTicket || '',
            'Fecha Mantenimiento': mant.fechaMantenimiento || ''
        };
    });

    // 4. Crear el libro y la hoja con SheetJS
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mantenimientos");

    // Ajustar el ancho de las columnas automáticamente (opcional pero recomendado)
    const wscols = [
        { wch: 15 }, // Código PV
        { wch: 35 }, // Nombre Punto
        { wch: 40 }, // Dirección
        { wch: 35 }, // Centro de Costo
        { wch: 15 }, // Municipio
        { wch: 25 }, // Técnico Asignado
        { wch: 20 }, // Número de Ticket
        { wch: 18 }  // Fecha Mantenimiento
    ];
    worksheet['!cols'] = wscols;

    // 5. Generar archivo y descargar
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte_mantenimientos_${fechaActual}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);

    console.log(`✅ Reporte Excel exportado con ${puntosConMantenimiento.length} mantenimientos.`);
}

// ===== Compartir Ubicación =====
function compartirUbicacion(lat, lng, nombre) {
    const enlace = `https://www.google.com/maps?q=${lat},${lng}`;

    navigator.clipboard.writeText(enlace).then(() => {
        mostrarToastCompartir(`Enlace copiado${nombre ? ': ' + nombre : ''}`);
    }).catch(() => {
        // Fallback para navegadores sin soporte de clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = enlace;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        mostrarToastCompartir(` Enlace copiado${nombre ? ': ' + nombre : ''}`);
    });
}

function mostrarToastCompartir(mensaje) {
    // Eliminar toast anterior si existe
    const toastExistente = document.getElementById('toast-compartir');
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-compartir';
    toast.className = 'toast-compartir';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`;
    document.body.appendChild(toast);

    // Trigger animación de entrada
    setTimeout(() => toast.classList.add('visible'), 10);

    // Ocultar y eliminar después de 2.5 segundos
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

// ===== Mensaje de Bienvenida =====
console.log(`
╔═══════════════════════════════════════╗
║   Mapa Interactivo - Puntos Cesar     ║
║   © 2026 - Versión 1.1                ║
╚═══════════════════════════════════════╝
`);
