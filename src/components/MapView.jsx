import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApi } from "@/hooks/useApi";
import { routeStyles } from "@/utils/routeStyles";
import "leaflet-polylinedecorator";

/** 
 * DEBUG:
 * Pintar manualmente los grafos desde back para comprobar visualmente
 * si la ruta calculada sigue el grafo esperado.
 * false = desactivado
 */
const SHOW_GRAPH_DEBUG = false;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// marcador circular con letra para identificar paradas del itinerario
function getLetterMarkerIcon(letter) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        background: #2563eb;
        color: white;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.35);
      ">
        ${letter}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Formatea una hora tipo "07:30:00" → "7:30"
function formatHour(hour) {
  if (!hour) return "--";

  const [h, m] = hour.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

// Convierte una hora "HH:mm:ss" a minutos totales
function timeToMinutes(hour) {
  if (!hour) return 0;
  const [h, m] = hour.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

// Convierte minutos totales a formato "H:mm"
function minutesToHour(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// Une tramos horarios que se solapan o son consecutivos
function mergeRanges(ranges) {
  if (!ranges.length) return [];

  const sorted = [...ranges].sort(
    (a, b) => timeToMinutes(a.open_time) - timeToMinutes(b.open_time)
  );

  const merged = [];
  // Inicializa con el primer tramo
  let current = {
    start: timeToMinutes(sorted[0].open_time),
    end: timeToMinutes(sorted[0].close_time),
  };

  for (let i = 1; i < sorted.length; i++) {
    const nextStart = timeToMinutes(sorted[i].open_time);
    const nextEnd = timeToMinutes(sorted[i].close_time);

    // Si se solapan o son continuos, los une
    if (nextStart <= current.end) {
      current.end = Math.max(current.end, nextEnd);
    } else {
      merged.push({
        start: minutesToHour(current.start),
        end: minutesToHour(current.end),
      });

      // Empieza un nuevo tramo
      current = {
        start: nextStart,
        end: nextEnd,
      };
    }
  }

  // Añade el último tramo
  merged.push({
    start: minutesToHour(current.start),
    end: minutesToHour(current.end),
  });

  return merged;
}

// Convierte selectedDate en una fecha local sin problemas de zona horaria
function parseLocalDate(value) {
  if (!value) return new Date();

  if (value instanceof Date) {
    return value;
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const [, year, month, day] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  return new Date(value);
}


// Devuelve una fecha en formato MM-DD
function getMonthDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}-${day}`;
}


// Comprueba si la fecha pertenece a una temporada anual.
// También permite temporadas que cruzan el cambio de año:
// 11-15 → 02-27
function isDateInRange(date, validFrom, validTo) {
  if (!validFrom || !validTo) {
    return true;
  }

  const currentMonthDay = getMonthDay(date);

  // Temporada dentro del mismo año
  if (validFrom <= validTo) {
    return (
      currentMonthDay >= validFrom &&
      currentMonthDay <= validTo
    );
  }

  // Temporada que cruza el cambio de año
  return (
    currentMonthDay >= validFrom ||
    currentMonthDay <= validTo
  );
}


// Comprueba si el día está incluido en el array dow
function isDowValid(dow, currentDow) {
  if (Array.isArray(dow)) {
    return dow.includes(currentDow);
  }

  // Compatibilidad con posibles datos antiguos
  if (dow === null || dow === undefined) {
    return true;
  }

  return Number(dow) === currentDow;
}


// Genera el texto de horarios visibles en el popup
function formatTodayPlaceHours(hours, selectedDate) {
  if (!Array.isArray(hours) || hours.length === 0) {
    return "<div>Sin horarios disponibles</div>";
  }

  const dateToUse = parseLocalDate(selectedDate);
  const currentDow = (dateToUse.getDay() + 6) % 7;
  const currentMonthDay = getMonthDay(dateToUse);

  const dateLabel = selectedDate ? "Ese día" : "Hoy";

  // Horarios correspondientes a la temporada seleccionada
  const seasonalHours = hours.filter((hour) =>
    isDateInRange(
      dateToUse,
      hour.valid_from,
      hour.valid_to
    )
  );

  if (seasonalHours.length === 0) {
    return "<div>Sin horarios disponibles</div>";
  }

  // Comprueba cierres extraordinarios
  const isClosedDate = seasonalHours.some((hour) => {
    const closedDates = Array.isArray(hour.closed_dates)
      ? hour.closed_dates
      : [];

    return closedDates.includes(currentMonthDay);
  });

  if (isClosedDate) {
    return `<div>${dateLabel}: Cerrado</div>`;
  }

  // Filtra por el día de la semana
  const todayHours = seasonalHours.filter((hour) =>
    isDowValid(hour.dow, currentDow)
  );

  // Existen horarios, pero no abre ese día
  if (todayHours.length === 0) {
    return `<div>${dateLabel}: Cerrado</div>`;
  }

  // Lugar público sin horario de apertura o cierre
  const hasFreeAccess = todayHours.some(
    (hour) =>
      !hour.open_time &&
      !hour.close_time &&
      !hour.last_entry_time
  );

  if (hasFreeAccess) {
    const duration = todayHours.find(
      (hour) => hour.visit_duration
    )?.visit_duration;

    return `
      <div>Acceso libre / sin horario</div>
      ${
        duration
          ? `<div style="color:#666;">Duración estimada: ${duration} min</div>`
          : ""
      }
    `;
  }

  const ranges = todayHours
    .filter((hour) => hour.open_time && hour.close_time)
    .map((hour) => ({
      open_time: hour.open_time,
      close_time: hour.close_time,
    }));

  if (ranges.length === 0) {
    return "<div>Sin horarios disponibles</div>";
  }

  const mergedRanges = mergeRanges(ranges);

  const hoursText = mergedRanges
    .map(
      (range) =>
        `${formatHour(range.start)} - ${formatHour(range.end)}`
    )
    .join(", ");

  const lastEntry = todayHours
    .map((hour) => hour.last_entry_time)
    .filter(Boolean)
    .sort(
      (a, b) => timeToMinutes(b) - timeToMinutes(a)
    )[0];

  const duration = todayHours.find(
    (hour) => hour.visit_duration
  )?.visit_duration;

  return `
    <div>${dateLabel}: ${hoursText}</div>
    ${
      lastEntry
        ? `<div style="color:#666;">Último acceso: ${formatHour(lastEntry)}</div>`
        : ""
    }
    ${
      duration
        ? `<div style="color:#666;">Duración estimada: ${duration} min</div>`
        : ""
    }
  `;
}


// Componente principal del mapa
const MapView = ({
  places,
  routeResult,
  routeMode,
  zones,
  tempZone,
  isDrawingZone,
  onMapClick,
  onLoadPlaceHours,
  itineraryStops,
  selectedCity,
  selectedDate,
  
}) => {
  const { fetchApi } = useApi();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef(L.layerGroup());

  const CITY_VIEWS = {
    alicante: { center: [38.3452, -0.481], zoom: 13 },
    javea: { center: [38.7890, 0.1661], zoom: 13 },
    valencia: { center: [39.4699, -0.3763], zoom: 13 },
    torrevieja: { center: [37.9787, -0.6822], zoom: 13 },
  };

  //mover el mapa 
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCity) return;

    const cityView = CITY_VIEWS[selectedCity.toLowerCase()];
    if (!cityView) return;

    map.flyTo(cityView.center, cityView.zoom, {
      duration: 1.2,
    });
  }, [selectedCity]);

  // Inicializa el mapa solo una vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Crea el mapa centrado inicialmente en ESPAÑA
    const map = L.map(containerRef.current).setView([40.4168, -3.7038], 6);

    // Añade la capa base de OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    layersRef.current.addTo(map);
    mapRef.current = map;

    // Limpia el mapa al desmontar
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

// Cargar y pintar los grafos desde backend (solo debug)
useEffect(() => {
  if (!SHOW_GRAPH_DEBUG) return;

  const map = mapRef.current;
  if (!map) return;

  const cities = ["alicante", "javea", "valencia", "torrevieja"];
    let graphLayers = [];

  const loadGraphs = async () => {
    try {
      for (const city of cities) {
        const geojson = await fetchApi(`/routes/graph?city=${city}`, {}, true);

        const layer = L.geoJSON(geojson, {
          style: {
            color: "#2563eb",
            weight: 1.5,
            opacity: 0.6,
          },
        });

        layer.addTo(map);
        graphLayers.push(layer);
      }

      const group = L.featureGroup(graphLayers);
      const bounds = group.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (err) {
      console.error("Error cargando grafos desde la api:", err);
    }
  };

  loadGraphs();

  return () => {
    graphLayers.forEach((layer) => {
      map.removeLayer(layer);
    });
  };
}, [fetchApi]);


  // Maneja clicks en el mapa para crear marcadores o zonas
  useEffect(() => {
    const map = mapRef.current;
    if (!map ) return;

    // Detecta clicks en el mapa y los envía al componente padre
    const handler = (e) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);

    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  useEffect(() => {
    const group = layersRef.current;
    const map = mapRef.current;
  if (!group || !map) return;

    group.clearLayers();
  
  // Lugares cargados desde backend
  places?.forEach((place) => {
    const marker = L.marker([place.lat, place.lon]).addTo(group);

    marker.bindPopup(`
      <div>
        <strong>${place.name || "Lugar"}</strong><br/>
        ${place.description || ""}<br/>
        <span style="color:#666;">Cargando horarios...</span>
      </div>
    `);

    marker.on("popupopen", async () => {
      const hours = await onLoadPlaceHours?.(place.place_id);
      const hoursHtml = formatTodayPlaceHours(hours, selectedDate);

      marker.setPopupContent(`
        <div>
          <strong>${place.name || "Lugar"}</strong><br/>
          ${place.description || ""}<br/><br/>
          <strong>Horarios:</strong>
          ${hoursHtml}
        </div>
      `);
    });
  });


  // Pinta los segmentos de ruta devueltos por backend y ajusta el mapa
 if (routeResult?.segments?.length) {
  const allLayers = [];

  routeResult.segments.forEach((segment) => {
    if (!segment?.geometry?.coordinates?.length) return;

    const style = routeStyles[segment.mode] || routeStyles.drive;

    const layer = L.geoJSON(segment.geometry, {
      style,
    }).addTo(group);

    allLayers.push(layer);
  });

  if (allLayers.length) {
    const featureGroup = L.featureGroup(allLayers);
    const bounds = featureGroup.getBounds();

    if (bounds.isValid()) {
    map.fitBounds(bounds, {
      paddingTopLeft: [80, 80],
      paddingBottomRight: [80, 360],
      maxZoom: 15,
    });
  }
}
}



  // Zonas guardadas
  zones.forEach((zone) => {
    L.polygon(
      zone.points.map((point) => [point.lat, point.lng]),
      {
        color: "#0B1B3A",
        fillColor: "#06B6D4",
        fillOpacity: 0.2,
        weight: 2,
      }
    ).addTo(group);
  });

  // Zona temporal mientras se está dibujando
  if (isDrawingZone && tempZone.length > 0) {
    L.polygon(
      tempZone.map((point) => [point.lat, point.lng]),
      {
        color: "#06B6D4",
        fillColor: "#06B6D4",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "6 4",
      }
    ).addTo(group);
  }
}, [places, routeResult, routeMode, zones, tempZone, isDrawingZone, onLoadPlaceHours, itineraryStops, selectedDate]);
  return <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg" />;
};

export default MapView;