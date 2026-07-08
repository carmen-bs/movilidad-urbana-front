import L from "leaflet";

/**
 * Icono personalizado para representar la ubicación del usuario en el mapa.
 * (círculo azul tipo Google Maps).
 */
const liveUserIcon = L.divIcon({ 
  className: "",
  html: `
    <div style="
      width: 18px;
      height: 18px;
      background: #2563EB;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Función encargada de renderizar la ubicación del usuario en el mapa.
 *  * 
 * Se encarga de:
 * - Añadir el marker del usuario
 * - Mostrar un popup ("Estás aquí")
 * - Dibujar un círculo de precisión alrededor del usuario
 */
export function renderLiveUserMarker(group, liveUserPosition) {
  // Si no hay grupo o posición, no hace nada
  if (!group || !liveUserPosition) return;

  /**
   * Marker principal del usuario
   */
  L.marker([liveUserPosition.lat, liveUserPosition.lng], { icon: liveUserIcon })
    .bindPopup("Estás aquí")
    .addTo(group);

  /**
   * Círculo que representa la precisión de la ubicación (GPS)
   */
  L.circle([liveUserPosition.lat, liveUserPosition.lng], {
    radius: liveUserPosition.accuracy || 20,
    color: "#3B82F6",
    fillColor: "#60A5FA",
    fillOpacity: 0.15,
    weight: 1,
  }).addTo(group);
}