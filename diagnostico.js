// Script de diagnóstico para búsqueda global
console.log('=== DIAGNÓSTICO DE BÚSQUEDA GLOBAL ===');

// 1. Verificar que el input existe
const searchInput = document.getElementById('search-global');
console.log('Input de búsqueda encontrado:', !!searchInput);

// 2. Verificar que el contenedor de resultados existe
const resultsContainer = document.getElementById('search-results');
console.log('Contenedor de resultados encontrado:', !!resultsContainer);

// 3. Verificar que allPuntos está definido
console.log('allPuntos definido:', typeof allPuntos !== 'undefined');
console.log('Número de puntos:', allPuntos?.length || 0);

// 4. Probar búsqueda manualmente
if (searchInput && resultsContainer && allPuntos) {
    // Simular evento de input
    console.log('Probando búsqueda con término "banco"...');

    const term = 'banco';
    const results = allPuntos.filter(punto => {
        const nombre = (punto.NOMBREPV || '').toLowerCase();
        const codigo = (punto.CODIGOPV || '').toLowerCase();
        return nombre.includes(term) || codigo.includes(term);
    });

    console.log('Resultados encontrados:', results.length);
    console.log('Primeros 3 resultados:', results.slice(0, 3).map(p => ({
        nombre: p.NOMBREPV,
        codigo: p.CODIGOPV
    })));
}

// 5. Verificar event listener
console.log('Event listeners en el input:', getEventListeners ? getEventListeners(searchInput) : 'getEventListeners no disponible');
