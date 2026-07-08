import { useState, useEffect, useCallback } from "react";
import { getAuthUser, loadJSON, saveJSON } from "@/utils/storage";
import { toast } from "sonner";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import RoutesPanel from "@/components/RoutesPanel";
import { useApi } from "@/hooks/useApi";
import AccessDenied from "@/pages/AccessDenied";
import { Car, Footprints, Bike, BusFront } from "lucide-react";


const HomePage = () => {
  const authUser = getAuthUser();
  const { fetchApi } = useApi();

  // usuario con acceso a la web/mapa
  const [hasAccess, setHasAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);

  const [places, setPlaces] = useState([]);
  const [apiError, setApiError] = useState("");
  const [zones, setZones] = useState([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [tempZone, setTempZone] = useState([]);
  const [serviceType, setServiceType] = useState([]);
  const [routeMode, setRouteMode] = useState("drive");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState([]);
  
  // ciudades/ zonas que el usuario tiene acceso
  const [allowedZones, setAllowedZones] = useState([]);

  /** Estado del bloque de itinerarios:
   * - lista de itinerarios
   * - estado de carga/error
   * - paradas y legs del itinerario seleccionado
   * - detalle de itinerarios
   */

  const [itineraries, setItineraries] = useState([]);
  const [itinerariesLoading, setItinerariesLoading] = useState(false);
  const [itinerariesError, setItinerariesError] = useState(""); 
  const [itineraryStops, setItineraryStops] = useState([]);
  const [itineraryLegs, setItineraryLegs] = useState([]);
  const [selectedItineraryDetail, setSelectedItineraryDetail] = useState(null);
  
  // Ciudad actualmente seleccionada en el panel.
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedRouteDate, setSelectedRouteDate] = useState("");
  // Comprbar el acceso desde el back y zonas permitidas
  useEffect(() => {
  async function checkAccess() {
    try {
      const data = await fetchApi("/me/access", {}, true);
      setHasAccess(data.access);
      setAllowedZones(data.allowedZones || []);
      setServiceType(data.serviceType || []);
      
    } catch (error) {
      console.error("Error comprobando acceso:", error);
      setHasAccess(false);
    } finally {
      setAccessLoading(false);
    }
  }
  checkAccess();
}, [fetchApi]);

// cargar itinerarios desde el back segun fecha, hora, ciudad y modos
const loadItineraries = async (date, time, modes, selectedPlaceIds) => {
  try {
    setItinerariesLoading(true);
    setItinerariesError("");
    setRouteResult(null);
    setItineraryStops([]);
    setSelectedItineraryDetail(null);
    
    const now = new Date();
    const fechaInicio = date 
    ? date.replaceAll("-", "") 
    : `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
   
    const horaInicio = time 
    ? time
    : `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  
    const params = new URLSearchParams({
      city: selectedCity,
      fecha_inicio: fechaInicio,
      hora_inicio: horaInicio,
      max_itineraries: "30",
    });

    // Solo se envían modos al backend si el usuario ha elegido modos manuales.
    if (Array.isArray(modes) && modes.length > 0 && !modes.includes("good")) {
      modes.forEach((mode) => {
        params.append("allowed_modes", mode);
      });
    }

    if (Array.isArray(selectedPlaceIds) && selectedPlaceIds.length > 0) {
      selectedPlaceIds.forEach((placeId) => {
        params.append("selected_place_ids", placeId);
      });
    }

    const data = await fetchApi(
      `/itineraries?${params.toString()}`,
      {},
      true
    );

    setItineraries(data.itineraries || []);
    setItineraryLegs(data.legs || []);
    console.log("MODOS ENVIADOS:", modes);
    console.log("PRIMER ITINERARIO:", data?.itineraries?.[0]);
    console.log("LEGS:", data?.legs);
  } catch (err) {
    console.error("Error cargando itinerarios:", err);
    setItinerariesError("Error al cargar itinerarios. Inténtalo más tarde");
    setItineraries([]);
    setItineraryLegs([]);
  } finally {
    setItinerariesLoading(false);
  }
};

// Modifica textos para poder comparar nombres ignorando mayúsculas y acentos.
const normalizeText = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * Cuando el usuario selecciona un itinerario del ranking:
  * busca sus lugares reales en el array de places
  * construye los segmentos uno a uno consultando /routes/search
  * genera la estructura final que MapView necesita para pintarlo
 */
const handleSelectItinerary = async (itinerary) => {
  try {
    setSelectedItineraryDetail(itinerary);
    if (!itinerary?.visit_order_names) {
      toast.error("El itinerario no tiene lugares válidos");
      return;
    }
    const names = itinerary.visit_order_names
      .split(" → ")
      .map((n) => n.trim())
      .filter(Boolean);

    const matchedPlaces = names
      .map((name) =>
        places.find(
          (p) => normalizeText(p.name) === normalizeText(name)
        )
      )
      .filter(Boolean);

    if (matchedPlaces.length < 2) {
      toast.error("No se pudieron asociar los lugares del itinerario con el mapa");
      return;
    }

    // Guarda las paradas para colocar los marcadores A, B, C... en el mapa.
    setItineraryStops(
      matchedPlaces.map((p) => ({
        lat: p.lat,
        lng: p.lon,
        name: p.name,
      }))
    );

    const segments = [];
    let totalDistanceM = 0;
    let totalDurationS = 0;

    // Recorre cada tramo entre dos paradas consecutivas del itinerario.
    for (let i = 0; i < matchedPlaces.length - 1; i++) {
      const fromPlace = matchedPlaces[i];
      const toPlace = matchedPlaces[i + 1];

      // Usa el modo real que haya elegido el backend para ese tramo
      const displayMode = itinerary.modes_used?.[i] || "drive";
      const apiMode = displayMode;

      const routes = await fetchApi(
        `/routes/search?from_place_id=${fromPlace.place_id}&to_place_id=${toPlace.place_id}&mode=${apiMode}`,
        {},
        true
      );

      if (!routes || routes.length === 0) continue;

      const route = routes[0];

      if (!route?.geometry?.coordinates?.length) continue;

      // Guarda cada segmento con su geometría y su modo para que el mapa
      // pinta tramo a tramo.
      segments.push({
        ...route,
        mode: displayMode,
      });

      totalDistanceM += route.cost_distance_m || 0;
      totalDurationS += route.cost_time_s || 0;
          }


if (!segments.length) {
  toast.error("No se pudo pintar el itinerario");
  return;
}

    const firstPlace = matchedPlaces[0];
    const lastPlace = matchedPlaces[matchedPlaces.length - 1];

    const result = {
      segments: segments.map((s) => ({
        geometry: s.geometry,
        mode: s.mode || "drive",
      })),
      originCoord: { lat: firstPlace.lat, lng: firstPlace.lon },
      destCoord: { lat: lastPlace.lat, lng: lastPlace.lon },
      distance: Math.round((totalDistanceM / 1000) * 10) / 10,
      duration: Math.round(totalDurationS / 60),
    };

    handleRouteCalculated(result, itinerary.modes_used?.[0] || "drive");

    toast.success("Itinerario cargado en el mapa");
  } catch (error) {
    console.error("Error pintando itinerario:", error);
    toast.error("Error al pintar el itinerario");
  }
};
  // Carga de lugares desde el backend
  useEffect(() => {
    async function cargarPlaces() {
      try {
        const data = await fetchApi("/places", {}, true);
        setPlaces(data);
        setApiError("");
      } catch (err) {
        setApiError(err.message || "Error al cargar lugares");
      }
    }

    if (hasAccess) {
      cargarPlaces();
    }
  }, [fetchApi, hasAccess]);

  /** 
   * Muestra ciudad permitida para usuario y seleciona 
   * Si tiene acceso a todas ("*"), mantiene la lista completa
   * Si la ciudad actual no está permitida, se cambia a la primera disponible
   */
  useEffect(() => {
    if (!allowedZones || allowedZones.length === 0) return;

    const allCities = ["alicante", "elche", "valencia", "peñiscola"];

    const availableCities = allowedZones.includes("*")
      ? allCities
      : allCities.filter((city) =>
          allowedZones.some((zone) => zone.toLowerCase() === city.toLowerCase())
        );

    if (availableCities.length === 0) return;

    if (selectedCity && !availableCities.includes(selectedCity)) {
      setSelectedCity("");
    }
  }, [allowedZones, selectedCity]);

  useEffect(() => {
    if (!hasAccess) return;

    const selZoneKey = `selectedZone:${authUser}`;
    const selZone = loadJSON(selZoneKey, null);


    if (selZone) {
      setZones([{ points: selZone.points }]);
      localStorage.removeItem(selZoneKey);
    }
  }, [authUser, hasAccess]);

// Hace reverse geocoding sobre una coordenada para mostrar información legible
// cuando el usuario pulsa sobre un punto libre del mapa
const getPointInfo = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    );

    const data = await res.json();
    const address = data.address || {};

    const name =
      data.name ||
      address.road ||
      address.neighbourhood ||
      address.suburb ||
      address.city ||
      "Ubicación seleccionada";

    const postalCode = address.postcode || "";
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      "";

    const province = address.state_district || address.state || "";

    const addressText = [postalCode, city, province].filter(Boolean).join(" ");

    return {
      lat,
      lng,
      name,
      address: addressText || data.display_name || "Dirección no disponible",
    };
  } catch (error) {
    console.error("Error al obtener información del punto:", error);

    return {
      lat,
      lng,
      name: "Ubicación seleccionada",
      address: "Dirección no disponible",
    };
  }
};

 /**
  * Maneja los clics en el mapa:
    * si se está dibujando una zona, añade un nuevo punto al polígono temporal
    * si no, obtiene la información del punto pulsado y muestra su tarjeta
  */
  const handleMapClick = useCallback(
  async (lat, lng) => {
    if (isDrawingZone) {
      setTempZone((prev) => [...prev, { lat, lng }]);
    } else {
      const pointInfo = await getPointInfo(lat, lng);
      setSelectedPoint(pointInfo);
    }
  },
  [isDrawingZone]
);

  //muestra los horarios de un lugar
  const getPlaceHours = async (placeId) => {
  try {
    const data = await fetchApi(`/places/${placeId}/hours`, {}, true);
    
    return data;
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    return [];
  }
};
  
//Guarda en estado la ruta o itinerario
  const handleRouteCalculated = (result, mode ) => {
    setRouteResult(result);
    setRouteMode(mode);
  };

  // Al pulsar place, se muestra en el mapa. Si se pulsa otra vez, se oculta.
  const visiblePlaces =
  selectedPlaceIds.length > 0
    ? places.filter((place) => selectedPlaceIds.includes(place.place_id))
    : [];


  // Pantalla carga mientras se valida el acceso del usuario
  if (accessLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Comprobando acceso...</p>
    </div>
  );
}

  // Si no tiene acceso, se muestra la pantalla de acceso denegado
  if (!hasAccess) {
    return <AccessDenied />;
  }
  if (!serviceType.includes("itinerarios")) {
    return <AccessDenied />;
  }

  const handleChangeCity = (city) => {
    setSelectedCity(city);
    setSelectedPlaceIds([]);
    setRouteResult(null);
    setItineraryStops([]);
    setItineraries([]);
    setItineraryLegs([]);
    setSelectedItineraryDetail(null);
  };

  const MODE_ICONS = {
    drive: Car,
    walk: Footprints,
    bike: Bike,
    drive_service: BusFront,
  };

  const MODE_COLORS = {
    drive: "text-verde-oscuro border-verde-oscuro",
    walk: "text-azul border-azul",
    bike: "text-orange-500 border-orange-500",
    drive_service: "text-purple-500 border-purple-500",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div
        className="px-6 py-6"
        style={{
          background:
            "linear-gradient(180deg, hsl(218 70% 14% / 0.06) 0%, transparent 100%)",
        }}
      >
        <h2 className="text-xl font-bold text-foreground">Visualiza rutas y zonas urbanas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona una ubicación, calcula rutas y define zonas directamente sobre el mapa.
        </p>
      </div>

      <div className="px-6 pb-2">
        {apiError && <p className="text-sm text-red-500">Error backend: {apiError}</p>}
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden relative">
        <aside className="w-[440px] shrink-0 bg-card border border-border rounded-lg p-5 flex flex-col gap-6 overflow-y-auto shadow-[var(--shadow-card)]">
        
          <RoutesPanel
            selectedCity={selectedCity}
            onChangeCity={handleChangeCity}
            allowedZones={allowedZones}
            itineraries={itineraries}
            itineraryLegs={itineraryLegs}
            itinerariesLoading={itinerariesLoading}
            itinerariesError={itinerariesError}
            onLoadItineraries={loadItineraries}
            onSelectItinerary={handleSelectItinerary}
            places={places}
            selectedPlaceIds={selectedPlaceIds}
            onChangeSelectedPlaceIds={setSelectedPlaceIds}
            onChangeRouteDate={setSelectedRouteDate}  
          />
        </aside>

        <div className="flex-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] overflow-hidden relative">
          <MapView
            places={visiblePlaces}   
            routeResult={routeResult}
            routeMode={routeMode}       
            zones={zones}
            tempZone={tempZone}
            isDrawingZone={isDrawingZone}
            onMapClick={handleMapClick}
            onLoadPlaceHours={getPlaceHours}
            allowedZones={allowedZones} 
            itineraryStops={itineraryStops}
            selectedCity={selectedCity}
            selectedDate={selectedRouteDate}

          />
        {/* tarjeta detalle itinerario horizontal */}
        {selectedItineraryDetail && (() => {
          const selectedLegs = itineraryLegs
            .filter((leg) => leg.itinerary_id === selectedItineraryDetail.itinerary_id)
            .sort((a, b) => (a.leg_seq || 0) - (b.leg_seq || 0));

            return (
          <div className="absolute left-4 right-4 bottom-4 z-[1000] bg-card border border-border rounded-2xl shadow-xl p-4 max-h-[430px] overflow-y-auto">

            {/* HEADER */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-verde-oscuro text-white flex items-center justify-center text-sm font-bold">
                    {selectedItineraryDetail.uiIndex || 1}
                  </div>

                  <h4 className="text-lg font-bold text-foreground">
                    Itinerario {selectedItineraryDetail.uiIndex || 1}
                  </h4>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>🕘 {(selectedItineraryDetail.start_datetime || "").slice(11, 16)} → {(selectedItineraryDetail.end_datetime || "").slice(11, 16)}</span>
                  <span>⏱ {Math.floor((selectedItineraryDetail.total_time_min || 0) / 60)} h {Math.round((selectedItineraryDetail.total_time_min || 0) % 60)} min</span>
                  <span>📍 {(selectedItineraryDetail.visit_order_names || "").split("→").filter(Boolean).length} paradas</span>
                  <span>{Math.round((selectedItineraryDetail.total_distance_m || 0) / 1000 * 10) / 10} km</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItineraryDetail(null)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>

            {/* TIMELINE */}
            <div className="mt-4 flex items-stretch gap-4 overflow-x-auto pb-2">      {(selectedItineraryDetail.visit_order_names || "")
                .split("→")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((stop, index, arr) => {
                  const leg = selectedLegs[index];
                const nextLeg = selectedLegs[index + 1];

                const travelMinutes =
                  leg?.visit_end_time && nextLeg?.arrival_time
                    ? Math.max(
                        0,
                        Math.round(
                          (new Date(nextLeg.arrival_time) - new Date(leg.visit_end_time)) / 60000
                        )
                      )
                    : 0;
                
                  const place = places.find(
                (p) => p.name?.toLowerCase().trim() === stop.toLowerCase().trim()
              );

              const mode = nextLeg?.mode_selected || selectedItineraryDetail.modes_used?.[index] || "bike";
              const Icon = MODE_ICONS[mode] || Bike;
              const colorClass = MODE_COLORS[mode] || "text-azul border-azul";

              return (
                <div key={index} className="flex items-center gap-4 shrink-0">

                  {/* CARD COMPLETA */}
                  <div className="w-[190px] min-w-[190px] rounded-xl border border-border bg-white p-3 shadow-sm">

                    {/* IMG */}
                    <div className="relative">
                      <img
                        src={place?.img || "/placeholder-place.jpg"}
                        className="w-full h-20 rounded-lg object-cover"
                      />

                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-verde-oscuro text-white flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + index)}
                      </div>
                    </div>

                    {/* NAME */}
                    <p className="mt-2 text-xs font-semibold text-foreground">
                      {stop}
                    </p>

                    {/* INFO */}
                    <div className="mt-3 text-[11px] space-y-2">

                      {/* Llegada */}
                      <div
                        className={`rounded-lg px-2 py-1.5 flex items-center gap-2 ${
                          index === 0
                            ? "bg-green-50 text-verde-oscuro"
                            : "bg-blue-50 text-azul"
                        }`}
                      >
                        <span>🕘</span>
                        <span className="font-semibold">
                          Llegada{" "}
                          {leg?.arrival_time?.slice(11, 16) || "--:--"}
                        </span>
                      </div>

                      {/* Visita */}
                      <div className="border-t border-border pt-2 flex flex-col items-center text-muted-foreground">
                        <span>👁 Tiempo de visita</span>
                        <span className="text-foreground font-semibold mt-1">
                          {leg?.visit_start_time?.slice(11, 16) || "--:--"} - {leg?.visit_end_time?.slice(11, 16) || "--:--"}
                        </span>
                      </div>

                      {/* Salida */}
                      <div
                        className={`rounded-lg px-2 py-1.5 flex items-center gap-2 ${
                          index === 0
                            ? "bg-green-50 text-verde-oscuro"
                            : "bg-blue-50 text-azul"
                        }`}
                      >
                        <span>🕘</span>
                        <span className="font-semibold">
                          Salida {leg?.visit_end_time?.slice(11, 16) || "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CONECTOR */}
                  {index < arr.length - 1 && (
                    <div className="w-[110px] flex flex-col items-center text-xs text-muted-foreground">
                      <Icon className={`w-5 h-5 mb-1 ${colorClass.split(" ")[0]}`} />
                      <div className={`w-full border-t-2 border-dotted mb-1 ${colorClass.split(" ")[1]}`} />
                      <span>
                        {travelMinutes < 60
                          ? `${travelMinutes} min`
                          : `${Math.floor(travelMinutes / 60)} h ${travelMinutes % 60} min`}                      
                      </span>

                      <span>
                        {Math.round(((selectedLegs[index + 1]?.cost_distance_m || 0) / 1000) * 10) / 10} km
                      </span>
                    </div>
                  )}
                    </div>
                  );
                })}
              </div>

            {/* RESUMEN INFERIOR */}
            <div className="mt-4 rounded-xl bg-verde-claro/10 border border-verde-claro/40 p-3 grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Hora de inicio</p>
                <p className="font-semibold">{(selectedItineraryDetail.start_datetime || "").slice(11, 16)}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Hora de fin</p>
                <p className="font-semibold">{(selectedItineraryDetail.end_datetime || "").slice(11, 16)}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Duración total</p>
                <p className="font-semibold">
                  {Math.floor((selectedItineraryDetail.total_time_min || 0) / 60)} h {Math.round((selectedItineraryDetail.total_time_min || 0) % 60)} min
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Distancia total</p>
                <p className="font-semibold">
                  {Math.round((selectedItineraryDetail.total_distance_m || 0) / 1000 * 10) / 10} km
                </p>
              </div>
            </div>
          </div>
        );
      })()}

        
       {selectedPoint && !routeResult &&(
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[60%] max-w-md bg-card border border-border rounded-xl shadow-lg p-4 flex items-center justify-between z-[100]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {selectedPoint.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedPoint.address}
              </span>
              <span className="text-xs text-azul mt-1">
                {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedPoint(null);
              }}
              className="ml-auto text-base text-muted-foreground hover:text-destructive transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default HomePage;