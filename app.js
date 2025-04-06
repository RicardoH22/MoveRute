let map = L.map('map').setView([10.96854, -74.78132], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

let marcadorOrigen = null;
let marcadorDestino = null;
let lineaRuta = null;

let seleccion = '';

function seleccionarComoOrigen() {
  seleccion = 'origen';
  Swal.fire('Haz clic en el mapa para seleccionar el punto de origen');
}

function seleccionarComoDestino() {
  seleccion = 'destino';
  Swal.fire('Haz clic en el mapa para seleccionar el punto de destino');
}

function reiniciarRuta() {
  if (marcadorOrigen) map.removeLayer(marcadorOrigen);
  if (marcadorDestino) map.removeLayer(marcadorDestino);
  if (lineaRuta) map.removeLayer(lineaRuta);
  marcadorOrigen = null;
  marcadorDestino = null;
  lineaRuta = null;
  seleccion = '';
  Swal.fire('Ruta reiniciada');
}

map.on('click', function(e) {
  if (seleccion === 'origen') {
    if (marcadorOrigen) map.removeLayer(marcadorOrigen);
    marcadorOrigen = L.marker(e.latlng).addTo(map).bindPopup('Origen').openPopup();
  } else if (seleccion === 'destino') {
    if (marcadorDestino) map.removeLayer(marcadorDestino);
    marcadorDestino = L.marker(e.latlng).addTo(map).bindPopup('Destino').openPopup();
  }

  if (marcadorOrigen && marcadorDestino) {
    if (lineaRuta) map.removeLayer(lineaRuta);
    let latlngs = [marcadorOrigen.getLatLng(), marcadorDestino.getLatLng()];
    lineaRuta = L.polyline(latlngs, { color: 'blue', weight: 4 }).addTo(map);

    const distancia = map.distance(latlngs[0], latlngs[1]);
    const velocidadPromedio = 30 * 1000 / 60 / 60; // 30 km/h en m/s
    const tiempoEnSegundos = distancia / velocidadPromedio;
    const minutos = Math.floor(tiempoEnSegundos / 60);
    const segundos = Math.floor(tiempoEnSegundos % 60);

    Swal.fire(`Distancia: ${(distancia/1000).toFixed(2)} km\nTiempo estimado: ${minutos} min ${segundos} seg`);
  }
});

function buscarDireccion(direccion) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${direccion}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        let latlng = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        map.setView(latlng, 16);
        L.marker(latlng).addTo(map).bindPopup(direccion).openPopup();
      } else {
        Swal.fire('Dirección no encontrada');
      }
    });
}
