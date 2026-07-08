import L from "leaflet";
import { routeStyles } from "../../utils/routeStyles";
import "leaflet-polylinedecorator";

/**
 * Dibuja una ruta o itinerario en el mapa.
 */
export function renderRouteLayer(
  group,
  map,
  routeResult,
  destText,
  liveUserPosition,
  isRouteActive,
  mode
) {
  if (!group || !map || !routeResult) return;

  // Limpia lo anterior
  group.clearLayers();

  // CASO 1: itinerario con varios segmentos
  if (Array.isArray(routeResult.segments) && routeResult.segments.length > 0) {
    routeResult.segments.forEach((segment) => {
      const coords = segment?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length === 0) return;

      const latLngCoords = coords.map(([lng, lat]) => [lat, lng]);
      const segmentMode = segment.mode || "drive";
      const style = routeStyles[segmentMode] || routeStyles.drive;

      const polyline = L.polyline(latLngCoords, style).addTo(group);

      L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: 25,
            repeat: 60,
            symbol: L.Symbol.arrowHead({
              pixelSize: 6,
              polygon: false,
              pathOptions: {
                color: style.color,
                weight: 2,
              },
            }),
          },
        ],
      }).addTo(group);
    });

    return;
  }

  // CASO 2: ruta simple con una sola geometry
  const style = routeStyles[mode] || routeStyles.drive;
  const coords = routeResult?.geometry?.coordinates;

  if (!Array.isArray(coords) || coords.length === 0) return;

  const latLngCoords = coords.map(([lng, lat]) => [lat, lng]);

  const polyline = L.polyline(latLngCoords, style).addTo(group);

  L.polylineDecorator(polyline, {
    patterns: [
      {
        offset: 25,
        repeat: 60,
        symbol: L.Symbol.arrowHead({
          pixelSize: 6,
          polygon: false,
          pathOptions: {
            color: style.color,
            weight: 2,
          },
        }),
      },
    ],
  }).addTo(group);
}