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
        console.log('Cargando datos...');
        const response = await fetch('datos_puntos.json');

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        allPuntos = await response.json();
        filteredPuntos = [...allPuntos];

        console.log(`✓ Cargados ${allPuntos.length} puntos`);

        // Procesar datos
        processData();

        // Actualizar UI
        updateStats();
        renderFilters();
        renderMarkers();

    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar los datos. Por favor, verifica que el archivo datos_puntos.json existe y es válido.');
    }
}

// ===== Procesar Datos =====
function processData() {
    // Obtener valores únicos
    const tecnicos = new Set();
    const cdas = new Set();
    const tipos = new Set();

    allPuntos.forEach(punto => {
        if (punto['TECNICO  ASIGNADO ']) tecnicos.add(punto['TECNICO  ASIGNADO '].trim());
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
}

function renderTecnicosFilter() {
    const container = document.getElementById('tecnicos-list');
    container.innerHTML = '';

    // Contar puntos por técnico
    const counts = {};
    allPuntos.forEach(punto => {
        const tecnico = punto['TECNICO  ASIGNADO ']?.trim();
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
        }
    }

    applyFilters();
}

// ===== Aplicar Filtros =====
function applyFilters() {
    filteredPuntos = allPuntos.filter(punto => {
        // Filtro de técnicos
        if (selectedTecnicos.size > 0) {
            const tecnico = punto['TECNICO  ASIGNADO ']?.trim();
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
            icon: createCustomIcon(punto.TIPO)
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
function createCustomIcon(tipo) {
    // Determinar si es un Centro de Costos (CDA) basado en el tipo
    const tipoUpper = tipo?.trim().toUpperCase();
    const isCDA = tipoUpper === 'CDA' || tipoUpper === 'CENTRO DE COSTOS';

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

    const iconHtml = `
        <div class="custom-marker ${isCDA ? 'cda-marker' : ''}" style="background-color: ${config.color}; width: ${config.size}px; height: ${config.size}px;">
            <i class="fas ${config.icon}" style="font-size: ${config.iconSize}px;"></i>
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
                    <span class="info-value">${punto['TECNICO  ASIGNADO '] || 'No asignado'}</span>
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
}

// ===== Resetear Filtros =====
function resetFilters() {
    // Limpiar selecciones
    selectedTecnicos.clear();
    selectedCDAs.clear();
    selectedTipos.clear();

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
    console.log('📦 Contenedor de resultados:', resultsContainer);

    const term = searchTerm.trim().toLowerCase();
    console.log('📝 Término de búsqueda procesado:', term, 'Longitud:', term.length);

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
    searchResults = allPuntos.filter(punto => {
        const nombre = String(punto.NOMBREPV || '').toLowerCase();
        const codigo = String(punto.CODIGOPV || '').toLowerCase();

        return nombre.includes(term) || codigo.includes(term);
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
    const term = searchTerm.toLowerCase().trim();

    items.forEach(item => {
        const label = item.querySelector('label').textContent.toLowerCase();
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

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
}

// ===== Mensaje de Bienvenida =====
console.log(`
╔═══════════════════════════════════════╗
║   Mapa Interactivo - Puntos Cesar     ║
║   © 2026 - Versión 1.0                ║
╚═══════════════════════════════════════╝
`);
