// Inicializar el mapa
const map = L.map('map').setView([10.9639, -74.7964], 13);

// Cargar mapa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Variables globales
const apiKey = '5b3ce3597851110001cf624867716585d67845408bf092bfca2b4269';
let inicio = null;
let destino = null;
let marcadorBusqueda = null;
let resultadoActual = null;
let rutaTrazada = null;

// Función para buscar direcciones usando Nominatim
function buscarDireccion(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);

                if (marcadorBusqueda) {
                    map.removeLayer(marcadorBusqueda);
                }

                marcadorBusqueda = L.marker([lat, lon]).addTo(map);
                map.setView([lat, lon], 15);

                resultadoActual = [lat, lon];
            } else {
                Swal.fire("Dirección no encontrada", "Intenta con otra dirección", "warning");
            }
        })
        .catch(err => {
            console.error("Error en la búsqueda:", err);
            Swal.fire("Error de búsqueda", "No se pudo realizar la búsqueda", "error");
        });
}

// Función para calcular ruta usando OpenRouteService
function calcularRuta(origen, destino) {
    const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

    fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            coordinates: [
                [origen.lng, origen.lat],
                [destino.lng, destino.lat]
            ]
        })
    })
    .then(res => res.json())
    .then(data => {
        if (rutaTrazada) {
            map.removeLayer(rutaTrazada);
        }

        rutaTrazada = L.geoJSON(data, {
            style: { color: 'blue', weight: 4 }
        }).addTo(map);

        const distancia = data.features[0].properties.summary.distance / 1000;
        const duracion = data.features[0].properties.summary.duration / 60;

        document.getElementById('infoRuta').innerHTML = `
            <strong>Ruta calculada:</strong><br>
            Distancia: ${distancia.toFixed(2)} km<br>
            Duración: ${duracion.toFixed(1)} minutos
        `;
    })
    .catch(err => {
        console.error('Error al calcular la ruta:', err);
        Swal.fire("Error", "No se pudo calcular la ruta. Intenta de nuevo.", "error");
    });
}

// Escuchar Enter en el campo de búsqueda
document.getElementById('search').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const query = e.target.value;
        buscarDireccion(query);
    }
});

// Botón para marcar punto como inicio
document.getElementById('btnInicio').addEventListener('click', () => {
    if (resultadoActual) {
        if (marcadorBusqueda) {
            map.removeLayer(marcadorBusqueda);
            marcadorBusqueda = null;
        }

        if (inicio) {
            map.removeLayer(inicio);
        }

        inicio = L.marker(resultadoActual, {
            icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png' })
        }).addTo(map);

        Swal.fire("Inicio marcado", "Este punto se usará como origen", "success");
    }
});

// Botón para marcar punto como destino y trazar ruta
document.getElementById('btnDestino').addEventListener('click', () => {
  if (resultadoActual) {
      // Eliminar marcador anterior de destino
      if (destino) {
          map.removeLayer(destino);
      }

      // Usar el marcador de búsqueda como destino si existe
      const [lat, lon] = resultadoActual;
      destino = L.marker([lat, lon], {
          icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png' })
      }).addTo(map);

      // Eliminar el marcador de búsqueda visual (ya se está usando como destino)
      if (marcadorBusqueda) {
          map.removeLayer(marcadorBusqueda);
          marcadorBusqueda = null;
      }

      Swal.fire("Destino establecido", "Has marcado el punto como destino", "success");

      if (inicio && destino) {
          calcularRuta(inicio.getLatLng(), destino.getLatLng());
      }
  }
});
// Función para reiniciar el mapa
function reiniciarMapa() {
    if (marcadorBusqueda) {
        map.removeLayer(marcadorBusqueda);
        marcadorBusqueda = null;
    }

    if (inicio) {
        map.removeLayer(inicio);
        inicio = null;
    }

    if (destino) {
        map.removeLayer(destino);
        destino = null;
    }

    if (rutaTrazada) {
        map.removeLayer(rutaTrazada);
        rutaTrazada = null;
    }

    resultadoActual = null;
    document.getElementById('infoRuta').innerHTML = `<em>Busca una dirección y traza una ruta.</em>`;
}

// Marcar puntos al hacer clic en el mapa
map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    if (inicio && destino && rutaTrazada) {
        reiniciarMapa();
    }

    if (!inicio) {
        inicio = L.marker([lat, lng], {
            icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png' })
        }).addTo(map);
        resultadoActual = [lat, lng];
        Swal.fire("Inicio marcado", "Seleccionaste el punto de partida", "info");
    } else if (!destino) {
        destino = L.marker([lat, lng], {
            icon: L.icon({ iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png' })
        }).addTo(map);
        resultadoActual = [lat, lng];
        Swal.fire("Destino marcado", "Seleccionaste el punto de destino", "info");

        calcularRuta(inicio.getLatLng(), destino.getLatLng());
    }
});
