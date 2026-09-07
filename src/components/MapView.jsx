import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { routeStyles } from "@/utils/routeStyles";


// =========================================================
// CONFIGURACIÓN GENERAL DE LEAFLET
// =========================================================

// Corrige las rutas de los iconos predeterminados de Leaflet.
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


// =========================================================
// ICONOS DE LA RUTA
// =========================================================

/**
 * Crea un marcador circular con una letra.
 *
 * A = origen
 * B = destino
 */
function getRouteMarkerIcon(letter, backgroundColor) {
  return L.divIcon({
    className: "",

    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 9999px;
        background: ${backgroundColor};
        color: white;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      ">
        ${letter}
      </div>
    `,

    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}
/**
 * Devuelve la letra correspondiente a cada punto:
 *
 * 0 → A
 * 1 → B
 * 2 → C
 */
function getRouteLetter(index) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  return letters[index] ?? "?";
}

// =========================================================
// FUNCIONES AUXILIARES
// =========================================================

/**
 * Evita insertar directamente texto sin escapar
 * dentro de los popups HTML de Leaflet.
 */
function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// Formatea una hora: "07:30:00" → "7:30"
function formatHour(hour) {
  if (!hour) {
    return "--";
  }

  const [hours, minutes] =
    String(hour).split(":");

  return `${parseInt(hours, 10)}:${minutes}`;
}


//Convierte una hora "HH:mm:ss" a minutos totales.
function timeToMinutes(hour) {
  if (!hour) {
    return 0;
  }

  const [hours, minutes] =
    String(hour).split(":");

  return (
    parseInt(hours, 10) * 60 +
    parseInt(minutes, 10)
  );
}


// Convierte minutos totales a formato "H:mm".
function minutesToHour(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return (
    `${hours}:` +
    `${remainingMinutes}`
      .padStart(2, "0")
  );
}


//Une rangos horarios que se solapan o son consecutivos.
function mergeRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return [];
  }

  // Ordena los rangos por hora de apertura.
  const sortedRanges = [...ranges].sort(
    (firstRange, secondRange) =>
      timeToMinutes(firstRange.open_time) -
      timeToMinutes(secondRange.open_time)
  );

  const mergedRanges = [];

  let currentRange = {
    start: timeToMinutes(
      sortedRanges[0].open_time
    ),

    end: timeToMinutes(
      sortedRanges[0].close_time
    ),
  };

  for (
    let index = 1;
    index < sortedRanges.length;
    index++
  ) {
    const nextStart = timeToMinutes(
      sortedRanges[index].open_time
    );

    const nextEnd = timeToMinutes(
      sortedRanges[index].close_time
    );

    // Si el siguiente rango empieza antes de que termine
    // el actual, se combinan.
    if (nextStart <= currentRange.end) {
      currentRange.end = Math.max(
        currentRange.end,
        nextEnd
      );
    } else {
      mergedRanges.push({
        start: minutesToHour(
          currentRange.start
        ),

        end: minutesToHour(
          currentRange.end
        ),
      });

      currentRange = {
        start: nextStart,
        end: nextEnd,
      };
    }
  }

  // Añade el último rango.
  mergedRanges.push({
    start: minutesToHour(
      currentRange.start
    ),

    end: minutesToHour(
      currentRange.end
    ),
  });

  return mergedRanges;
}


/**
 * Convierte la fecha seleccionada en una fecha local.
 * Evita problemas de zona horaria al trabajar con valores como "2026-07-22".
 */
function parseLocalDate(value) {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

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


/**
 * Devuelve una fecha en formato MM-DD.
 * Ejemplo: 24 de junio → "06-24"
 */
function getMonthDay(date) {
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${month}-${day}`;
}


/**
 * Normaliza fechas de temporada y cierres.
 *Permite:
 * - "06-24"
 * - "24/06"
 */
function normalizeMonthDay(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  // Formato MM-DD.
  if (/^\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // Formato DD/MM.
  const slashMatch = text.match(
    /^(\d{2})\/(\d{2})$/
  );

  if (slashMatch) {
    const [, day, month] = slashMatch;

    return `${month}-${day}`;
  }

  return text;
}


/**
 * Comprueba si una fecha pertenece a una temporada anual.
 *
 * También permite temporadas que cruzan el cambio de año:
 * 11-15 → 02-27
 */
function isDateInRange(
  date,
  validFrom,
  validTo
) {
  if (!validFrom || !validTo) {
    return true;
  }

  const normalizedFrom =
    normalizeMonthDay(validFrom);

  const normalizedTo =
    normalizeMonthDay(validTo);

  const currentMonthDay =
    getMonthDay(date);

  // Temporada dentro del mismo año.
  if (normalizedFrom <= normalizedTo) {
    return (
      currentMonthDay >= normalizedFrom &&
      currentMonthDay <= normalizedTo
    );
  }

  // Temporada que cruza el cambio de año.
  return (
    currentMonthDay >= normalizedFrom ||
    currentMonthDay <= normalizedTo
  );
}


/**
 * Comprueba si el día de la semana está incluido en el campo dow.
 * 0 = lunes
 * 6 = domingo
 */
function isDowValid(dow, currentDow) {
  if (Array.isArray(dow)) {
    return dow
      .map(Number)
      .includes(currentDow);
  }

  // Compatibilidad con datos antiguos.
  if (
    dow === null ||
    dow === undefined
  ) {
    return true;
  }

  return Number(dow) === currentDow;
}


//Genera el HTML del horario que se muestra dentro del popup del lugar.
function formatTodayPlaceHours(
  hours,
  selectedDate
) {
  if (
    !Array.isArray(hours) ||
    hours.length === 0
  ) {
    return "<div>Sin horarios disponibles</div>";
  }

  const dateToUse =
    parseLocalDate(selectedDate);

  
  // lunes = 0
  const currentDow =
    (dateToUse.getDay() + 6) % 7;

  const currentMonthDay =
    getMonthDay(dateToUse);

  const dateLabel = selectedDate
    ? "Ese día"
    : "Hoy";


  // Filtra los horarios correspondientes a la temporada seleccionada.
  const seasonalHours = hours.filter(
    (hour) =>
      isDateInRange(
        dateToUse,
        hour.valid_from,
        hour.valid_to
      )
  );

  if (seasonalHours.length === 0) {
    return "<div>Sin horarios disponibles</div>";
  }


  // Comprueba cierres extraordinarios.
  const isClosedDate = seasonalHours.some(
    (hour) => {
      const closedDates =
        Array.isArray(hour.closed_dates)
          ? hour.closed_dates
          : [];

      return closedDates
        .map(normalizeMonthDay)
        .includes(currentMonthDay);
    }
  );

  if (isClosedDate) {
    return `<div>${dateLabel}: Cerrado</div>`;
  }


  // Filtra por el día de la semana.
  const todayHours = seasonalHours.filter(
    (hour) =>
      isDowValid(
        hour.dow,
        currentDow
      )
  );

  if (todayHours.length === 0) {
    return `<div>${dateLabel}: Cerrado</div>`;
  }


  // Detecta lugares de acceso libre, sin hora de apertura ni cierre.
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
          ? `
            <div style="color:#666;">
              Duración estimada: ${duration} min
            </div>
          `
          : ""
      }
    `;
  }


  // Obtiene los intervalos de apertura.
  const ranges = todayHours
    .filter(
      (hour) =>
        hour.open_time &&
        hour.close_time
    )
    .map((hour) => ({
      open_time: hour.open_time,
      close_time: hour.close_time,
    }));

  if (ranges.length === 0) {
    return "<div>Sin horarios disponibles</div>";
  }


  // Une intervalos que se solapan.
  const mergedRanges =
    mergeRanges(ranges);

  const hoursText = mergedRanges
    .map(
      (range) =>
        `${formatHour(range.start)} - ` +
        `${formatHour(range.end)}`
    )
    .join(", ");


  // Obtiene la última hora de acceso.
  const lastEntry = todayHours
    .map(
      (hour) =>
        hour.last_entry_time
    )
    .filter(Boolean)
    .sort(
      (firstHour, secondHour) =>
        timeToMinutes(secondHour) -
        timeToMinutes(firstHour)
    )[0];


  // Obtiene la duración estimada de la visita.
  const duration = todayHours.find(
    (hour) => hour.visit_duration
  )?.visit_duration;


  return `
    <div>
      ${dateLabel}: ${hoursText}
    </div>

    ${
      lastEntry
        ? `
          <div style="color:#666;">
            Último acceso: ${formatHour(lastEntry)}
          </div>
        `
        : ""
    }

    ${
      duration
        ? `
          <div style="color:#666;">
            Duración estimada: ${duration} min
          </div>
        `
        : ""
    }
  `;
}


// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

const MapView = ({
  places = [],
  routeResult,
  routeMode = "drive",
  zones = [],
  tempZone = [],
  isDrawingZone = false,
  onMapClick,
  onLoadPlaceHours,
  selectedCity,
  selectedDate,
}) => {
  // Referencia a la instancia de Leaflet.
  const mapRef = useRef(null);

  // Referencia al div que contiene el mapa.
  const containerRef = useRef(null);

  // Grupo donde se dibujan los elementos dinámicos:
  // lugares, ruta, marcadores y zonas.
  const layersRef = useRef(
    L.layerGroup()
  );


  // =========================================================
  // CONFIGURACIÓN DE CIUDADES
  // =========================================================

  const CITY_VIEWS = {
    alicante: {
      center: [38.3452, -0.481],
      zoom: 13,
    },

    javea: {
      center: [38.789, 0.1661],
      zoom: 13,
    },

    valencia: {
      center: [39.4699, -0.3763],
      zoom: 13,
    },

    torrevieja: {
      center: [37.9787, -0.6822],
      zoom: 13,
    },
  };


  // =========================================================
  // INICIALIZAR MAPA
  // =========================================================

  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return;
    }

    // Inicia el mapa mostrando España.
    const map = L.map(
      containerRef.current
    ).setView(
      [40.4168, -3.7038],
      6
    );


    // Añade la capa base de OpenStreetMap.
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(map);


    // Añade el grupo de capas dinámicas.
    layersRef.current.addTo(map);

    mapRef.current = map;


    // Fuerza el ajuste del tamaño cuando el mapa se muestra dentro del diseño flex.
    window.setTimeout(() => {
      map.invalidateSize();
    }, 100);


    // Limpia el mapa al desmontar el componente.
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  // =========================================================
  // CAMBIO DE CIUDAD
  // =========================================================

  // Mueve el mapa a la ciudad seleccionada.
  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !selectedCity ||
      routeResult
    ) {
      return;
    }

    const cityView =
      CITY_VIEWS[
        selectedCity.toLowerCase()
      ];

    if (!cityView) {
      return;
    }

    map.flyTo(
      cityView.center,
      cityView.zoom,
      {
        duration: 1.2,
      }
    );
  }, [selectedCity, routeResult]);


  // =========================================================
  // CLICS EN EL MAPA
  // =========================================================

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      typeof onMapClick !== "function"
    ) {
      return;
    }

    const handleClick = (event) => {
      onMapClick(
        event.latlng.lat,
        event.latlng.lng
      );
    };

    map.on(
      "click",
      handleClick
    );

    return () => {
      map.off(
        "click",
        handleClick
      );
    };
  }, [onMapClick]);


  // =========================================================
  // PINTAR ELEMENTOS EN EL MAPA
  // =========================================================

  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;

    if (!map || !group) {
      return;
    }

    // Limpia los elementos anteriores.
    group.clearLayers();


// =======================================================
//  COMPROBAR SI EXISTE UNA RUTA VÁLIDA
// =======================================================

// Comprueba si existe una ruta válida.
    const hasRoute =
      Array.isArray(routeResult?.segments) &&
      routeResult.segments.length > 0 &&
      routeResult.segments.every(
        (segment) =>
          segment?.geometry?.type === "LineString" &&
          Array.isArray(segment?.geometry?.coordinates) &&
          segment.geometry.coordinates.length >= 2
    );
// Solo mostramos lugares normales si NO hay ruta
  if (!hasRoute) {
    places.forEach((place) => {
      const lat = Number(place.lat);
      const lng = Number(place.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn("Lugar con coordenadas inválidas:", place);
        return;
      }

      const marker = L.marker([lat, lng]);

      const placeName = place.name || place.nombre || "Lugar";
      const description = place.description || place.descripcion || "";

      // Popup inicial mientras se cargan los horarios
      marker.bindPopup(`
        <div>
          <strong>${escapeHtml(placeName)}</strong>
          ${description ? `<br/><br/>${escapeHtml(description)}` : ""}
          <br/><br/>
          <strong>Horarios:</strong>
          <div>Cargando...</div>
        </div>
      `);

      marker.addTo(group);

      // Cargar horarios del lugar
      (async () => {
        try {
          const hours = await onLoadPlaceHours?.(place.place_id);

          const hoursHtml = formatTodayPlaceHours(
            hours,
            selectedDate
          );

          marker.setPopupContent(`
            <div>
              <strong>${escapeHtml(placeName)}</strong>
              ${description ? `<br/><br/>${escapeHtml(description)}` : ""}
              <br/><br/>
              <strong>Horarios:</strong>
              <div>${hoursHtml}</div>
            </div>
          `);
        } catch (error) {
          console.error(
            "Error cargando horarios:",
            place.place_id,
            error
          );

          marker.setPopupContent(`
            <div>
              <strong>${escapeHtml(placeName)}</strong>
              ${description ? `<br/><br/>${escapeHtml(description)}` : ""}
              <br/><br/>
              <strong>Horarios:</strong>
              <div>Cerrado</div>
            </div>
          `);
        }
      })();
    });
  }


    // =======================================================
    // LUGARES DE LA CIUDAD
    // =======================================================

    // Los lugares se muestran cuando todavía no hay una ruta calculada.
    if (hasRoute) {
      console.log("========== DIBUJANDO RUTA ==========");
      console.log("routeResult:", routeResult);

      const routeLayers = [];

      routeResult.segments.forEach((segment, index) => {
        console.log(`SEGMENTO ${index}`, segment);

        if (!segment?.geometry) {
          console.warn("Segmento sin geometry");
          return;
        }

        console.log("Tipo:", segment.geometry.type);
        console.log(
          "Nº coordenadas:",
          segment.geometry.coordinates?.length
        );

        const style =
          routeStyles[segment.mode] ||
          routeStyles[routeMode] ||
          routeStyles.drive;

        try {
          const latLngs = segment.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          );

          const layer = L.polyline(latLngs, style);

          console.log(
            "Bounds del segmento:",
            layer.getBounds().toBBoxString()
          );

          layer.addTo(group);
          routeLayers.push(layer);

          console.log(
            `Segmento ${index} añadido correctamente al mapa`
          );
        } catch (e) {
          console.error(
            "ERROR creando segmento",
            e,
            segment
          );
        }
      });

      console.log(
        "Número de layers creados:",
        routeLayers.length
      );

      // ===================================================
      // MARCADORES
      // ===================================================

      const destinationCoords =
        Array.isArray(routeResult.destinationCoords) &&
        routeResult.destinationCoords.length > 0
          ? routeResult.destinationCoords
          : routeResult.destCoord
          ? [routeResult.destCoord]
          : [];

      const destinationLabels =
        Array.isArray(routeResult.destinationLabels)
          ? routeResult.destinationLabels
          : [];

      const routePoints = [
        {
          coord: routeResult.originCoord,
          label:
            routeResult.originLabel ??
            "Origen",
        },

        ...destinationCoords.map(
          (coord, index) => ({
            coord,
            label:
              destinationLabels[index] ??
              `Destino ${index + 1}`,
          })
        ),
      ];

      console.log("Puntos:", routePoints);

      routePoints.forEach((point, index) => {
        if (!point.coord) return;

        const lat = Number(point.coord.lat);
        const lng = Number(point.coord.lng);

        console.log(
          `Marcador ${index}`,
          lat,
          lng
        );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          console.warn(
            "Coordenadas inválidas"
          );
          return;
        }

        L.marker(
          [lat, lng],
          {
            icon: getRouteMarkerIcon(
              getRouteLetter(index),
              index === 0
                ? "#2563EB"
                : "#DC2626"
            ),
          }
        )
          .bindPopup(
            escapeHtml(point.label)
          )
          .addTo(group);
      });

      if (routeLayers.length > 0) {
        const featureGroup =
          L.featureGroup(routeLayers);

        const bounds =
          featureGroup.getBounds();

        console.log(
          "Bounds finales:",
          bounds.toBBoxString()
        );

        if (bounds.isValid()) {
          console.log("Haciendo fitBounds");

          map.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: 16,
          });
        } else {
          console.warn(
            "Bounds NO válidos"
          );
        }
      }

      console.log("========== FIN RUTA ==========");
    }


    // =======================================================
    // ZONAS GUARDADAS
    // =======================================================

    zones.forEach((zone) => {
      if (
        !Array.isArray(zone?.points) ||
        zone.points.length < 3
      ) {
        return;
      }

      L.polygon(
        zone.points.map(
          (point) => [
            point.lat,
            point.lng,
          ]
        ),
        {
          color: "#0B1B3A",
          fillColor: "#06B6D4",
          fillOpacity: 0.2,
          weight: 2,
        }
      ).addTo(group);
    });


    // =======================================================
    // ZONA TEMPORAL
    // =======================================================

    if (
      isDrawingZone &&
      tempZone.length > 0
    ) {
      L.polygon(
        tempZone.map(
          (point) => [
            point.lat,
            point.lng,
          ]
        ),
        {
          color: "#06B6D4",
          fillColor: "#06B6D4",
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "6 4",
        }
      ).addTo(group);
    }
  }, [
    places,
    routeResult,
    routeMode,
    zones,
    tempZone,
    isDrawingZone,
    onLoadPlaceHours,
    selectedDate,
  ]);


  // =========================================================
  // CONTENEDOR DEL MAPA
  // =========================================================

  // Marcador "C" se traducia a "do", asi ya no hay problemas
  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg"
      translate="no" 
    />
  );
};

export default MapView;