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
  
    const origenLatLng = L.latLng(origen.lat, origen.lon);
    const destinoLatLng = L.latLng(destino.lat, destino.lon);
  
    if (!BARRANQUILLA_BOUNDS.contains(origenLatLng) || !BARRANQUILLA_BOUNDS.contains(destinoLatLng)) {
      Swal.fire("Ruta fuera de Barranquilla", "Tanto el origen como el destino deben estar en Barranquilla.", "error");
      return;
    }
  
    // Eliminar ruta anterior si existe
    if (window.rutaPolyline) map.removeLayer(window.rutaPolyline);
  
    const router = L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' });
    router.route([
      origenLatLng,
      destinoLatLng
    ], (err, rutas) => {
      if (err || rutas.length === 0) {
        Swal.fire("Error al trazar ruta", "No se pudo obtener la ruta.", "error");
        return;
      }
  
      const coordenadas = rutas[0].coordinates;
      let rutaCompleta = [];
  
      let i = 0;
      const interval = setInterval(() => {
        if (i < coordenadas.length) {
          rutaCompleta.push([coordenadas[i].lat, coordenadas[i].lng]);
          if (window.rutaPolyline) map.removeLayer(window.rutaPolyline);
          window.rutaPolyline = L.polyline(rutaCompleta, { color: 'blue', weight: 5 }).addTo(map);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 30);
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
  