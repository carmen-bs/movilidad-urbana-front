import { useState } from "react";
import { Route as RouteIcon, Car, Footprints, Bike, BusFront, Sparkles } from "lucide-react";

// Modulos de transporte disponibles 
// automático: busca los mejores itinerarios sin filtrar por transporte.
const TRANSPORT_MODES = [
  { id: "good", label: "Mejor", icon: Sparkles }, 
  { id: "drive", label: "Coche", icon: Car },
  { id: "walk", label: "A pie", icon: Footprints },
  { id: "bike", label: "Bicicleta", icon: Bike},
  { id: "drive_service", label: "Bus", icon: BusFront },
];

// Traducción de los ids de modos a textos para mostrar en UI
const MODE_LABELS = {
  walk: "A pie",
  drive: "Coche",
  bike: "Bicicleta",
  drive_service: "Bus",
};

/**
 * Panel lateral de itinerarios:
  * permite elegir ciudad, modos, fecha y hora
  * lanza la búsqueda de itinerarios
 */
const RoutesPanel = ({ selectedCity, onChangeCity, allowedZones, itineraries, itineraryLegs, itinerariesLoading, itinerariesError, onLoadItineraries, onSelectItinerary, places, selectedPlaceIds, onChangeSelectedPlaceIds, onChangeRouteDate, }) => {
  const [modes, setModes] = useState(["good"]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [validationError, setValidationError] = useState("");

  const NORMAL_MODES = ["drive", "walk", "bike", "drive_service"];

  // Selección de modos de transporte.
  const toggleMode = (modeId) => {
    setModes((prev) => {
      // Si pulsa "good, desactivan los otros
      if (modeId === "good") {
        return ["good"];
      }

      // Si pulsa un modo normal y estaba "good", lo quita
      const withoutGood = prev.filter((m) => m !== "good");
      
      let updated;

      // Si el modo ya estaba activo, lo desactiva.
      if (withoutGood.includes(modeId)) {
        updated = withoutGood.filter((m) => m !== modeId);
        return updated.length > 0 ? updated : withoutGood;
      }

      // Si no estaba activo, lo añade
      updated = [...withoutGood, modeId];

      // Si están los 4 modos normales activos, lo convertimos a "good"
      const hasAllNormalModes = NORMAL_MODES.every((mode) =>
        updated.includes(mode)
      );

      if (hasAllNormalModes) {
        return ["good"];
      }

      return updated;
    });
  };


  // Lista completa de ciudades disponibles en la app
  const ALL_CITIES = [
    { value: "alicante", label: "Alicante" },
    { value: "elche", label: "Elche" },
    { value: "valencia", label: "Valencia" },
    { value: "peñiscola", label: "Peñíscola" },
  ];

  // Ciudades que se mostrarán en el desplegable según lo contratado
  const availableCities =
    allowedZones?.includes("*")
      ? ALL_CITIES
      : ALL_CITIES.filter((city) =>
          allowedZones?.some(
            (zone) => zone.toLowerCase() === city.value.toLowerCase()
          )
        );
  
  const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Lugares de la ciudad seleccionada
  const cityPlaces = (places || []).filter((place) =>
    normalizeText(place.name).includes(normalizeText(selectedCity))
  );

  //marcar o desmarcar lugar de ciudad
  const togglePlaceSelection = (placeId) => {
    if (selectedPlaceIds.includes(placeId)) {
      onChangeSelectedPlaceIds(selectedPlaceIds.filter((id) => id !== placeId));
    } else {
      onChangeSelectedPlaceIds([...selectedPlaceIds, placeId]);
    }
  };

  // Extrae las paradas del itinerario a partir del string "A → B → C"
  const getItineraryStops = (itinerary) => {
  return (itinerary?.visit_order_names || "")
    .split("→")
    .map((item) => item.trim())
    .filter(Boolean);
  };

  // Obtiene y ordena los tramos (legs) de un itinerario concreto
  const getLegsForItinerary = (itineraryId) => {
  return (itineraryLegs || [])
    .filter((leg) => leg.itinerary_id === itineraryId)
    .sort((a, b) => (a.leg_seq || 0) - (b.leg_seq || 0));
  };

  // Formatea fechas tipo ISO a formato HH:mm para mostrar en UI
  const formatLegTime = (value) => {
    if (!value) return "--:--";

    const text = String(value);

    if (text.includes("T")) {
      return text.slice(11, 16);
    }

    if (text.includes(" ")) {
      return text.slice(11, 16);
    }

    return text.slice(0, 5);
  };

  // Formatea duración en segundos a "X h Y min"
  const formatDuration = (seconds) => {
    const totalMinutes = Math.round((seconds || 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0
      ? `${hours} h ${minutes > 0 ? `${minutes} min` : ""}`
      : `${minutes} min`;
  };

  //ordenar ranking: duración total de menor a mayor
  const sortedItineraries = [...(itineraries || [])].sort(
    (a, b) => (a.total_time_min || 999999) - (b.total_time_min || 999999)
  );

  // Búsqueda solo si hay fecha y hora
  // No hay: botón desactivado
  const handleSearchItineraries = () => {
    setValidationError("");

    if (!selectedCity || !date || !time) {
      setValidationError("Selecciona una ciudad, fecha y hora.");
      return;
    }

    if (selectedPlaceIds.length < 2) {
      setValidationError("Selecciona al menos 2 lugares.");
      return;
    }

    const now = new Date();
    const selectedDateTime = new Date(`${date}T${time}`);

    if (selectedDateTime < now) {
      setValidationError("La fecha y hora seleccionadas no son válidas.");
      return;
    }

    onLoadItineraries(date, time, modes, selectedPlaceIds);
  };

    // Panel de itinerarios: filtros, hora de salida y ranking de resultados
    return (
      <>
      {/* Titulo */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <RouteIcon className="w-4 h-4 text-azul" />
          Rutas
        </h3>

        {/* Botones selección modo de transporte */}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            {TRANSPORT_MODES.map((t) => {
              const IconComp = t.icon;
              const isActive = modes.includes(t.id);

              return (
                <button key={t.id} type="button"
                  onClick={() => toggleMode(t.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md text-[10px] font-medium transition-all duration-150 border ${
                    isActive ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-foreground hover:border-accent/50"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
              
        {/* DESTINO */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Destino
          </label>
          <select
            value={selectedCity}
            onChange={(e) => {
              onChangeCity(e.target.value);
              onChangeSelectedPlaceIds([]); // Limpiar selección de lugares al cambiar de ciudad
            }}
            className="h-[48px] rounded-2xl border border-border bg-white px-4 pr-10 text-sm text-foreground shadow-sm transition-all 
                      focus:outline-none focus:ring-2 focus:ring-azul/30 hover:border-azul/40"
          >
            <option value="" disabled>
              Selecciona destino
            </option>
            
            {availableCities.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </div>
      
      {/* LUGARES DE LA CIUDAD */}
      {selectedCity && cityPlaces.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Lugares
          </label>

          <div className="rounded-xl border border-border bg-card p-3 max-h-[180px] overflow-y-auto flex flex-col gap-2">
            {cityPlaces.map((place) => (
              <label key={place.place_id} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={selectedPlaceIds.includes(place.place_id)}
                  onChange={() => togglePlaceSelection(place.place_id)}
                />
                <span>{place.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
        {/* Fecha */}
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setDate(e.target.value);
                onChangeRouteDate?.(e.target.value);
                setValidationError("");
              }}
              className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground"
            />
          </div>
          

            {/* Hora */}
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setValidationError("");
                }}
                className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground"
              />
            </div>
          </div>

          {/* BOTON BUSQUEDA */}
          <button
            onClick={handleSearchItineraries}
            disabled={itinerariesLoading || !selectedCity || !date || !time}
            className="h-[44px] rounded-md bg-verde text-white text-sm font-medium hover:bg-verde-oscuro transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {itinerariesLoading ? "Buscando..." : "Buscar itinerarios"}
          </button>
          {validationError && (
            <p className="text-xs text-red-600 font-medium">
              {validationError}
            </p>
          )}

            {/* Ranking de itinerarios disponibles ordenados por duración */}
            <div className="rounded-lg p-4 border border-border bg-card flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase">Ranking de itinerarios</h4>

              <div className="max-h-[400px] overflow-y-auto flex flex-col gap-2">

                {itineraries?.length === 0 && !itinerariesLoading && (
                  <p className="text-sm text-muted-foreground">
                    No hay itinerarios cargados
                  </p>
                )}

                {sortedItineraries.map((it, index) => {                
                  const totalMinutes = Math.round(it.total_time_min || 0);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  const firstStopName = getItineraryStops(it)[0];
                  const firstPlace = (places || []).find(
                    (p) => p.name?.toLowerCase().trim() === firstStopName?.toLowerCase().trim()
                  );
                  const imageUrl = firstPlace?.image_url  || firstPlace?.img || "/placeholder-place.jpg";
                  
                  const durationText =
                    hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;

                  const distanceKm = Math.round((it.total_distance_m || 0) / 1000 * 10) / 10;

                  const stopsCount = getItineraryStops(it).length;

                  // Se muestran todos los modos usados en el itinerario sin repetir valores.
                  const modesText =
                    Array.isArray(it.modes_used) && it.modes_used.length > 0
                      ? [...new Set(it.modes_used)]
                        .map((m) => MODE_LABELS[m] || m)
                        .join(", ")
                      : "Sin modo";

                  return (
                    <button
                      key={it.itinerary_id || index}
                      type="button"
                      onClick={() => {
                        onSelectItinerary?.({
                          ...it,
                          uiIndex: index + 1
                        });
                      }}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        index === 0
                          ? "border-verde-oscuro bg-verde-claro/20"
                          : "border-border bg-card hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Número visual del ranking */}
                        <div
                          className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center text-xs font-semibold text-white mt-0.5 ${
                            index === 0 ? "bg-verde-oscuro" : "bg-azul"
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Imagen del primer lugar del itinerario */}
                        <img
                          src={imageUrl}
                          alt={firstStopName || `Itinerario ${index + 1}`}
                          className="w-20 h-16 rounded-lg object-cover shrink-0 bg-muted"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-place.jpg";
                          }}
                        />

                        {/* Resumen del itinerario */}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-foreground truncate">
                            Itinerario {index + 1}
                          </h5>

                          <div className="text-xs text-muted-foreground mt-1">
                            {(it.start_datetime || "").slice(11, 16) || "--:--"} →{" "}
                            {(it.end_datetime || "").slice(11, 16) || "--:--"} · {durationText}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1 truncate">
                              {modesText} · {stopsCount} paradas · {distanceKm} km
                            </div>
                          </div>

                          <div className="text-muted-foreground text-lg leading-none shrink-0">
                            ›
                          </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
        </div>
      </>  
      );
    };

export default RoutesPanel;