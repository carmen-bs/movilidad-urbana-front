import { useMemo, useState } from "react";
import { Route as RouteIcon, Car, Footprints, Bike,BusFront, Sparkles, Navigation, Clock, } from "lucide-react";
import { useApi } from "@/hooks/useApi";

/**
 * MODOS DE TRANSPORTE
 * 
 * El usuario elige hasta 3 metodos de trasnporte para calclar la ruta. 
 * Si elige los 3, se considera la opción "Mejor" que combina los 3 modos.
 * Modos disponibles: coche, a pie, bicicleta. El modo bus está deshabilitado por ahora.
*/
const TRANSPORT_MODES = [
  {
    id: "good",
    label: "Mejor",
    icon: Sparkles,
  },
  {
    id: "drive",
    label: "Coche",
    icon: Car,
    osrmProfile: "driving",
  },
  {
    id: "walk",
    label: "A pie",
    icon: Footprints,
    osrmProfile: "walking",
  },
  {
    id: "bike",
    label: "Bicicleta",
    icon: Bike,
    osrmProfile: "cycling",
  },
  {
    id: "drive_service",
    label: "Bus",
    icon: BusFront,
    disabled: true,
  },
];

// Traducción de los identificadores para mostrarlos en la interfaz.
const MODE_LABELS = {
  good: "Mejor opción",
  drive: "Coche",
  walk: "A pie",
  bike: "Bicicleta",
  drive_service: "Bus",
  mixed: "Mixto",
};


/**
 * CIUDADES
 * 
 * 4 Ciudades disponibles: Alicante, Jávea, Valencia y Torrevieja.
*/
const ALL_CITIES = [
  { value: "alicante", label: "Alicante" },
  { value: "javea", label: "Jávea" },
  { value: "valencia", label: "Valencia" },
  { value: "torrevieja", label: "Torrevieja" },
];


// Normaliza textos para comparar ciudades ignorando mayúsculas, minúsculas y acentos.
const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();


// Formatea una duración en minutos.
const formatDuration = (minutes = 0) => {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
};

  const RoutesPanel = ({
    selectedCity,
    onChangeCity,
    places = [],
    selectedPlaceIds = [],
    onChangeSelectedPlaceIds,
    selectedModes = [],
    onSelectedModesChange,
    onRouteCalculated,
    onSelectItinerary,
    onChangeRouteDate,
  }) => {

  const { fetchApi } = useApi();

  // Fecha y hora de inicio del itinerario.
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");

  // Opciones devueltas por la API.
  const [itineraries, setItineraries] = useState([]);

  // Itinerario seleccionado en el ranking.
  const [selectedItineraryId, setSelectedItineraryId] =
    useState("");

  // Estado de búsqueda.
  const [searching, setSearching] = useState(false);

  // Mensaje de validación o error.
  const [error, setError] = useState("");


  /**
   * LUGARES DE LA CIUDAD SELECCIONADA
  */ 
  // Filtra los lugares de Supabase por la ciudad seleccionada.
  const cityPlaces = useMemo(() => {
    if (!selectedCity) {
      return [];
    }

    return places.filter(
      (place) =>
        normalizeText(place.city_id) === normalizeText(selectedCity)
    );
  }, [places, selectedCity]);

  
  /**
 * CAMBIO DE CIUDAD
 */ 

  const handleChangeCity = (city) => {
    // Informa a HomePage de la nueva ciudad.
    onChangeCity?.(city);

    // Limpia los destinos de la ciudad anterior.
    onChangeSelectedPlaceIds?.([]);

    setError("");
  };


  // Añade o elimina un lugar de la lista de destinos.
  const toggleDestination = (placeId) => {
    if (selectedPlaceIds.includes(placeId)) {
      onChangeSelectedPlaceIds?.(
        selectedPlaceIds.filter(
          (currentId) => currentId !== placeId
        )
      );
    } else {
      onChangeSelectedPlaceIds?.([
        ...selectedPlaceIds,
        placeId,
      ]);
    }

    setError("");
  };

  /**
    * BUSCAR ITINERARIOS EN LA API
  */ 
  const handleSearchItineraries = async () => {
    setError("");

    if (!selectedCity) {
      setError("Selecciona una ciudad.");
      return;
    }

    if (selectedPlaceIds.length < 2) {
      setError(
        "Selecciona al menos dos lugares."
      );
      return;
    }

    if (!date || !time) {
      setError(
        "Selecciona una fecha y una hora."
      );
      return;
    }

    if (selectedModes.length === 0) {
      setError("Selecciona al menos un modo de transporte.");
      return;
    }
    // Comprobamos que haya al menos un modo seleccionado.
    const allowedModes = selectedModes;

    setSearching(true);
    setItineraries([]);
    setSelectedItineraryId("");

    try {
      const data = await fetchApi(
        "/itineraries/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            city: selectedCity,

            // La API espera YYYYMMDD.
            fecha_inicio: date.replaceAll("-", ""),

            hora_inicio: time,

            selected_place_ids:
              selectedPlaceIds,

            allowed_modes: allowedModes,

            max_itineraries: 5,
          }),
        },
        true
      );

      console.log("Respuesta API:", data);
      
      const generatedItineraries =
        Array.isArray(data?.itineraries)
          ? data.itineraries
          : [];

      setItineraries(
        generatedItineraries.sort(
          (first, second) =>
            first.ranking_position -
            second.ranking_position
        )
      );

      if (generatedItineraries.length === 0) {
        setError(
          "No se encontraron itinerarios viables."
        );
      }
    } catch (searchError) {
      console.error(
        "Error buscando itinerarios:",
        searchError
      );

      setError(
        searchError.message ||
          "No se pudieron generar los itinerarios."
      );
    } finally {
      setSearching(false);
    }
  };


  /**
    * SELECCIONAR UN ITINERARIO
   */ 
  const handleSelectItinerary = (itinerary) => {
    const itineraryRoutes = [
      ...(itinerary.routes || []),
    ].sort(
      (first, second) =>
        first.route_order -
        second.route_order
    );

    // Recupera los lugares completos para obtener sus coordenadas.
    const orderedPlaces = (
      itinerary.place_ids || []
    )
      .map((placeId) =>
        places.find(
          (place) =>
            place.place_id === placeId
        )
      )
      .filter(Boolean);

    if (orderedPlaces.length < 2) {
      setError(
        "No se encontraron las coordenadas del itinerario."
      );
      return;
    }

    const coordinates = orderedPlaces.map(
      (place) => ({
        lat: Number(place.lat),
        lng: Number(
          place.lon ?? place.lng
        ),
      })
    );

    const hasInvalidCoordinate =
      coordinates.some(
        (coordinate) =>
          !Number.isFinite(coordinate.lat) ||
          !Number.isFinite(coordinate.lng)
      );

    if (hasInvalidCoordinate) {
      setError(
        "Uno de los lugares no tiene coordenadas válidas."
      );
      return;
    }

    const originCoord = coordinates[0];
    const destinationCoords =
      coordinates.slice(1);

    const modesUsed =
      itinerary.modes_used || [];

    const calculatedMode =
      modesUsed.length === 1
        ? modesUsed[0]
        : "mixed";

    const result = {
      // Cada trayecto guardado incluye su geometría.
      segments: itineraryRoutes
        .filter(
          (route) =>
            route.route_geometry
        )
        .map((route) => ({
          geometry:
            route.route_geometry,

          mode:
            route.transport_mode ||
            "drive",
        })),

      originCoord,

      destCoord:
        destinationCoords[
          destinationCoords.length - 1
        ],

      destinationCoords,

      originLabel:
        orderedPlaces[0].name,

      destinationLabel:
        orderedPlaces
          .slice(1)
          .map((place) => place.name)
          .join(" → "),

      destinationLabels:
        orderedPlaces
          .slice(1)
          .map((place) => place.name),

      distance:
        Math.round(
          (
            Number(
              itinerary.total_distance_m ||
                0
            ) / 1000
          ) * 10
        ) / 10,

      duration:
        Number(
          itinerary.total_time_min || 0
        ),

      calculatedMode,

      itineraryId:
        itinerary.itinerary_id,

      itineraryRoutes,
    };

    setSelectedItineraryId(
      itinerary.itinerary_id
    );
    
    onSelectItinerary?.(itinerary);

    setError("");

    console.log(
      result.segments.map(segment => ({
        mode: segment.mode,
        geometry: !!segment.geometry,
      }))
    );

    console.log("RESULTADO COMPLETO");
    console.log(result);

    result.segments.forEach((segment, i) => {
      console.log(
        "SEGMENTO",
        i,
        segment.geometry.type,
        segment.geometry.coordinates.length
      );
    });

    console.log("RESULTADO JSON");
    console.log(JSON.stringify(result, null, 2));
    
    onRouteCalculated?.(
      result,
      modesUsed[0] || "drive"
    );
  };

  /**
    * INTERFAZ
   */
  return (
    <div className="flex flex-col gap-4">
      {/* TÍTULO */}
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
        <RouteIcon className="w-4 h-4 text-azul" />
        Rutas
      </h3>


      {/* MODOS DE TRANSPORTE */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Modo de transporte
        </span>

        <div className="flex gap-1.5">
          {TRANSPORT_MODES.map((transportMode) => {
            const IconComp = transportMode.icon;

            const isBestMode =
              selectedModes.length === 3 &&
              selectedModes.includes("drive") &&
              selectedModes.includes("walk") &&
              selectedModes.includes("bike");

            const isActive =
              transportMode.id === "good"
                ? isBestMode
                : !isBestMode && selectedModes.includes(transportMode.id);

            return (
              <button
                key={transportMode.id}
                type="button"
                disabled={transportMode.disabled}
                onClick={() => {
                  if (transportMode.disabled) return;

                  // Pulsar "Mejor"
                  if (transportMode.id === "good") {
                    onSelectedModesChange(["drive", "walk", "bike"]);
                    return;
                  }

                  const isBestMode =
                  selectedModes.length === 3 &&
                  selectedModes.includes("drive") &&
                  selectedModes.includes("walk") &&
                  selectedModes.includes("bike");

                // Si está activo "Mejor" y pulsa un modo, cambiamos directamente a ese modo.
                if (
                  isBestMode &&
                  transportMode.id !== "good"
                ) {
                  onSelectedModesChange([transportMode.id]);
                  setError("");
                  return;
                }
                  let newModes;

                  if (selectedModes.includes(transportMode.id)) {
                  newModes = selectedModes.filter(
                    (m) => m !== transportMode.id
                  );
                } else {
                  newModes = [...selectedModes, transportMode.id];
                }

                // Si están los tres modos, equivale a "Mejor"
                const hasAllModes =
                  newModes.includes("drive") &&
                  newModes.includes("walk") &&
                  newModes.includes("bike");

                if (hasAllModes) {
                  onSelectedModesChange(["drive", "walk", "bike"]);
                  setError("");
                  return;
                }

                // Nunca dejar vacío
                if (newModes.length === 0) {
                  newModes = ["drive"];
                }

                onSelectedModesChange(newModes);
                  setError("");
                }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md text-[10px] font-medium transition-all duration-150 border ${
                  transportMode.disabled
                    ? "opacity-40 cursor-not-allowed border-border bg-secondary text-muted-foreground"
                    : isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-foreground hover:border-accent/50"
                }`}
              >
                <IconComp className="w-4 h-4" />
                {transportMode.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* CIUDAD DE DESTINO */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Ciudad de destino
        </label>

        <select
          value={selectedCity || ""}
          onChange={(event) =>
            handleChangeCity(event.target.value)
          }
          className="h-[48px] rounded-2xl border border-border bg-white px-4 pr-10 text-sm text-foreground shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-azul/30 hover:border-azul/40"
        >
          <option value="" disabled>
            Selecciona una ciudad
          </option>

          {ALL_CITIES.map((city) => (
            <option
              key={city.value}
              value={city.value}
            >
              {city.label}
            </option>
          ))}
        </select>
      </div>

         {/* LUGARES DE DESTINO */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-azul" />
          Lugares de destino
        </label>

        {!selectedCity && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              Selecciona primero una ciudad.
            </p>
          </div>
        )}

        {selectedCity && cityPlaces.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              No hay lugares disponibles en esta ciudad.
            </p>
          </div>
        )}

        {selectedCity && cityPlaces.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3 max-h-[180px] overflow-y-auto flex flex-col gap-2">
            {cityPlaces.map((place) => {
              const isSelected =
                selectedPlaceIds.includes(place.place_id);

              return (
                <label
                  key={place.place_id}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      toggleDestination(place.place_id)
                    }
                    className="w-4 h-4 accent-verde-oscuro"
                  />

                  <span className="flex-1">
                    {place.name}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>


      {/* FECHA Y HORA */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-azul" />
            Fecha
          </label>

          <input
            type="date"
            value={date}
            min={
              new Date()
                .toISOString()
                .split("T")[0]
            }
            onChange={(event) => {
              const selectedDate =
                event.target.value;

              setDate(selectedDate);
              setItineraries([]);
              setSelectedItineraryId("");

              onChangeRouteDate?.(
                selectedDate
              );
            }}
            className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Hora
          </label>

          <input
            type="time"
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
              setItineraries([]);
              setSelectedItineraryId("");
            }}
            className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground"
          />
        </div>
      </div>


      {/* ERROR */}
      {error && (
        <p className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}


      {/* BOTÓN BUSCAR */}
      <button
        type="button"
        onClick={handleSearchItineraries}
        disabled={
          searching ||
          selectedPlaceIds.length < 2 ||
          !date ||
          !time
        }
        className="h-[44px] rounded-md bg-verde text-white text-sm font-medium hover:bg-verde-oscuro transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RouteIcon className="w-4 h-4" />

        {searching
          ? "Buscando itinerarios..."
          : "Buscar itinerarios"}
      </button>


      {/* RANKING DE ITINERARIOS */}
      {itineraries.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase text-foreground">
            Ranking de itinerarios
          </h4>

          {itineraries.map((itinerary) => {
            const isSelected =
              selectedItineraryId ===
              itinerary.itinerary_id;

            const distanceKm =
              Number(
                itinerary.total_distance_m ||
                  0
              ) / 1000;

            return (
              <button
                key={itinerary.itinerary_id}
                type="button"
                onClick={() =>
                  handleSelectItinerary(
                    itinerary
                  )
                }
                className={`rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-verde-oscuro bg-verde-claro/20"
                    : "border-border bg-card hover:border-verde"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-verde-oscuro text-white text-sm font-bold flex items-center justify-center">
                    {itinerary.ranking_position}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Itinerario{" "}
                      {itinerary.ranking_position}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {(itinerary.place_names || [])
                        .join(" → ")}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {formatDuration(
                          itinerary.total_time_min
                        )}
                      </span>

                      <span>
                        {distanceKm.toFixed(1)} km
                      </span>

                      <span>
                        {(itinerary.modes_used || [])
                          .map(
                            (currentMode) =>
                              MODE_LABELS[
                                currentMode
                              ] ||
                              currentMode
                          )
                          .join(", ")}
                      </span>
                    </div>
                  </div>

                  <span className="text-muted-foreground">
                    ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default RoutesPanel;