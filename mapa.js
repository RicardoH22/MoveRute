const BARRANQUILLA_BOUNDS = L.latLngBounds(
  L.latLng(10.9, -74.95),
  L.latLng(11.1, -74.7)
);

let origen = null;
let destino = null;
let ultimaDireccionBuscada = null;
let rutasFavoritas = [];
let origenMarker = null;
let destinoMarker = null;

const map = L.map('map').setView([10.96854, -74.78132], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

async function buscarDireccionDesdeInput() {
  const direccion = document.getElementById('direccionInput').value;
  if (!direccion) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&bounded=1&viewbox=-74.95,11.1,-74.7,10.9`;

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'MoveRouteApp/1.0' } });
    const data = await response.json();

    if (data.length === 0) {
      Swal.fire("No encontrado", "No se encontró la dirección. Intenta con otra.", "warning");
      return;
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const point = L.latLng(lat, lon);

    if (!BARRANQUILLA_BOUNDS.contains(point)) {
      Swal.fire("Fuera de Barranquilla", "La dirección está fuera del área permitida.", "error");
      return;
    }

    L.marker([lat, lon]).addTo(map).bindPopup(result.display_name).openPopup();
    map.setView([lat, lon], 16);

    ultimaDireccionBuscada = { lat, lon, nombre: result.display_name };
  } catch (error) {
    Swal.fire("Error", "No se pudo buscar la dirección.", "error");
    console.error(error);
  }
}

function usarDireccionComo(tipo) {
  if (!ultimaDireccionBuscada) {
    Swal.fire("Primero busca una dirección", "Usa el buscador para elegir una dirección.", "info");
    return;
  }

  const latlng = L.latLng(ultimaDireccionBuscada.lat, ultimaDireccionBuscada.lon);

  if (tipo === 'origen') {
    origen = ultimaDireccionBuscada;
    if (origenMarker) map.removeLayer(origenMarker);
    origenMarker = L.marker(latlng, { icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', iconSize: [25, 41], iconAnchor: [12, 41] }) })
      .addTo(map).bindPopup("Origen");
  }

  if (tipo === 'destino') {
    destino = ultimaDireccionBuscada;
    if (destinoMarker) map.removeLayer(destinoMarker);
    destinoMarker = L.marker(latlng, { icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png', iconSize: [25, 41], iconAnchor: [12, 41] }) })
      .addTo(map).bindPopup("Destino");
  }

  trazarRuta();
}

function trazarRuta() {
  if (!origen || !destino) return;

  const origenCoords = [origen.lon, origen.lat];
  const destinoCoords = [destino.lon, destino.lat];

  const apiKey = '5b3ce3597851110001cf624867716585d67845408bf092bfca2b4269';
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

  fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      coordinates: [origenCoords, destinoCoords],
      alternative_routes: {
        target_count: 3,
        share_factor: 0.5,
        weight_factor: 1.6
      }
    })
  })
  .then(res => res.json())
  .then(data => {
    if (window.rutasAlternativas) {
      window.rutasAlternativas.forEach(r => map.removeLayer(r));
    }
    window.rutasAlternativas = [];

    const colores = ['blue', 'green', 'orange'];
    let resumenRutas = [];

    if (!data.features || data.features.length === 0) {
      Swal.fire("Sin rutas", "No se encontraron rutas alternativas.", "info");
      return;
    }

    data.features.forEach((ruta, i) => {
      const color = colores[i % colores.length];
      const distancia = ruta.properties.summary.distance; // en metros
      const duracion = ruta.properties.summary.duration; // en segundos

      const linea = L.geoJSON(ruta, {
        style: { color, weight: 5 }
      }).addTo(map);

      window.rutasAlternativas.push(linea);

      resumenRutas.push({
        numero: i + 1,
        distancia,
        duracion,
        color
      });
    });

    resumenRutas.sort((a, b) => a.distancia - b.distancia);
    const masCorta = resumenRutas[0];
    const masLarga = resumenRutas[resumenRutas.length - 1];

    let mensaje = '<b>Resumen de rutas encontradas:</b><br><ul>';
    resumenRutas.forEach(r => {
      const minutos = Math.floor(r.duracion / 60);
      const segundos = Math.floor(r.duracion % 60);
      mensaje += `<li style="color:${r.color};">Ruta ${r.numero}: ${(r.distancia / 1000).toFixed(2)} km, ${minutos} min ${segundos} seg</li>`;
    });
    mensaje += '</ul>';
    mensaje += `<b style="color:green;">✔ Más corta: Ruta ${masCorta.numero}</b><br>`;
    mensaje += `<b style="color:red;">✖ Más larga: Ruta ${masLarga.numero}</b>`;

    Swal.fire({
      title: 'Comparativa de rutas',
      html: mensaje
    });
  })
  .catch(err => {
    console.error(err);
    Swal.fire("Error", "No se pudieron obtener las rutas alternativas.", "error");
  });
}

function guardarRutaFavorita() {
  if (!origen || !destino) {
    Swal.fire("Incompleto", "Debes establecer origen y destino antes de guardar.", "info");
    return;
  }

  const ruta = {
    origen: { ...origen },
    destino: { ...destino },
    timestamp: new Date().toLocaleString()
  };

  rutasFavoritas.push(ruta);
  actualizarListaFavoritas();
  Swal.fire("Ruta guardada", "La ruta fue añadida a tus favoritas.", "success");
}

function actualizarListaFavoritas() {
  const lista = document.getElementById('listaFavoritas');
  if (!lista) return;
  lista.innerHTML = '';
  rutasFavoritas.forEach((ruta, index) => {
    const div = document.createElement('div');
    div.className = 'favorita';

    const texto = document.createElement('span');
    texto.innerText = `#${index + 1} - Origen: ${ruta.origen.nombre} → Destino: ${ruta.destino.nombre} [${ruta.timestamp}]`;
    texto.style.cursor = 'pointer';
    texto.onclick = () => usarRutaFavorita(index);

    const btnEliminar = document.createElement('button');
    btnEliminar.innerText = '🗑️';
    btnEliminar.style.marginLeft = '10px';
    btnEliminar.onclick = () => eliminarRutaFavorita(index);

    div.appendChild(texto);
    div.appendChild(btnEliminar);
    lista.appendChild(div);
  });
}

function usarRutaFavorita(index) {
  const ruta = rutasFavoritas[index];
  if (!ruta) return;
  origen = ruta.origen;
  destino = ruta.destino;
  ultimaDireccionBuscada = origen;
  usarDireccionComo('origen');
  ultimaDireccionBuscada = destino;
  usarDireccionComo('destino');
}

function eliminarRutaFavorita(index) {
  rutasFavoritas.splice(index, 1);
  actualizarListaFavoritas();
}

function reiniciarMapa() {
  // Quitar marcadores si existen
  if (origenMarker) map.removeLayer(origenMarker);
  if (destinoMarker) map.removeLayer(destinoMarker);
  origenMarker = null;
  destinoMarker = null;
  origen = null;
  destino = null;

  // Quitar rutas si existen
  if (window.rutasAlternativas) {
    window.rutasAlternativas.forEach(r => map.removeLayer(r));
    window.rutasAlternativas = [];
  }

  // Centrar el mapa nuevamente
  map.setView([10.96854, -74.78132], 13);

  Swal.fire("Mapa reiniciado", "Se eliminó la ruta y los marcadores.", "success");
}