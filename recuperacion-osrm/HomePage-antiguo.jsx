import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthUser, loadJSON, saveJSON } from "@/utils/storage";
import { toast } from "sonner";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import MarkersPanel from "@/components/MarkersPanel";
import RoutesPanel from "@/components/RoutesPanel";
import ZonesPanel from "@/components/ZonesPanel";
import { Save } from "lucide-react";
import { useApi } from "@/hooks/useApi";

const HomePage = () => {
  const authUser = getAuthUser();
  const { fetchApi } = useApi();

  const [places, setPlaces] = useState([]);
  const [apiError, setApiError] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [routeOriginLabel, setRouteOriginLabel] = useState("");
  const [routeDestLabel, setRouteDestLabel] = useState("");
  const [routeMode, setRouteMode] = useState("coche");
  const [departureTime, setDepartureTime] = useState("");
  const [zones, setZones] = useState([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [tempZone, setTempZone] = useState([]);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [isUserLocation, setIsUserLocation] = useState(false);
  const [liveUserPosition, setLiveUserPosition] = useState(null);
  const watchIdRef = useRef(null);

  const markersKey = `markers:${authUser}`;
  const [markers, setMarkers] = useState(() => loadJSON(markersKey, []));


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

    cargarPlaces();
  }, [fetchApi]);

  useEffect(() => {
    const selRouteKey = `selectedRoute:${authUser}`;
    const selZoneKey = `selectedZone:${authUser}`;
    const selRoute = loadJSON(selRouteKey, null);
    const selZone = loadJSON(selZoneKey, null);

    if (selRoute) {
      setRouteResult({
        originCoord: { lat: selRoute.origen.lat, lng: selRoute.origen.lng },
        destCoord: { lat: selRoute.destino.lat, lng: selRoute.destino.lng },
        geometry: selRoute.geometry,
        distance: selRoute.distanciaKm,
        duration: selRoute.duracionMin,
      });
      setRouteOriginLabel(selRoute.origen.label);
      setRouteDestLabel(selRoute.destino.label);
      localStorage.removeItem(selRouteKey);
    }

    if (selZone) {
      setZones([{ points: selZone.points }]);
      localStorage.removeItem(selZoneKey);
    }
  }, [authUser]);

  useEffect(() => {
    saveJSON(markersKey, markers);
  }, [markers, markersKey]);

  // Manejo de clicks en el mapa para agregar marcadores o puntos de zona
  const handleMapClick = useCallback(
    (lat, lng) => {
      if (isDrawingZone) {
        setTempZone((prev) => [...prev, { lat, lng }]);
      } else {
        setMarkers((prev) => [...prev, { lat, lng }]);
      }
    },
    [isDrawingZone]
  );

//muestra los horarios de un lugar
  const getPlaceHours = async (placeId) => {
  try {
    const data = await fetchApi(`/places/${placeId}/hours`, {}, true);
    console.log("placeId:", placeId);
    console.log("hours:", data);
    return data;
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    return [];
  }
};

  const removeMarker = (index) => {
    setMarkers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const closeZone = () => {
    if (tempZone.length >= 3) {
      const defaultName = `Zona ${zones.length + 1}`;
      const name = prompt("Nombre de la zona:", defaultName) || defaultName;

      const savedZone = {
        id: crypto.randomUUID(),
        nombre: name,
        points: tempZone,
        fechaISO: new Date().toISOString(),
      };

      const zonesKey = `zonas:${authUser}`;
      const existing = loadJSON(zonesKey, []);
      saveJSON(zonesKey, [...existing, savedZone]);

      setZones((prev) => [...prev, { points: tempZone }]);
      toast.success("Zona guardada");
    }

    setTempZone([]);
    setIsDrawingZone(false);
  };
 
  // Maneja resultado de c├ílculo de ruta desde el panel
  const handleRouteCalculated = (result, originLabel, destLabel, mode, depTime, userLocation) => {
    setRouteResult(result);
    setRouteOriginLabel(originLabel);
    setRouteDestLabel(destLabel);
    setRouteMode(mode);
    setDepartureTime(depTime);
    setIsUserLocation(userLocation);
  };

  const saveRoute = () => {
    if (!routeResult) return;

    let llegadaHora;

    if (departureTime && routeResult.duration > 0) {
      const [h, m] = departureTime.split(":").map(Number);
      const total = h * 60 + m + routeResult.duration;
      const ah = Math.floor(total / 60) % 24;
      const am = total % 60;
      llegadaHora = `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
    }
 // Crea objeto de ruta guardada y la almacena en localStorage
    const saved = {
      id: crypto.randomUUID(),
      origen: {
        label: routeOriginLabel,
        lat: routeResult.originCoord.lat,
        lng: routeResult.originCoord.lng,
      },
      destino: {
        label: routeDestLabel,
        lat: routeResult.destCoord.lat,
        lng: routeResult.destCoord.lng,
      },
      modo: routeMode,
      distanciaKm: routeResult.distance,
      duracionMin: routeResult.duration,
      salidaHora: departureTime || undefined,
      llegadaHora,
      geometry: routeResult.geometry,
      fechaISO: new Date().toISOString(),
    };

    const key = `rutas:${authUser}`;
    const existing = loadJSON(key, []);
    saveJSON(key, [...existing, saved]);
    toast.success("Ruta guardada");
  };
  
  const startLiveRoute = () => {
  if (!navigator.geolocation) {
    toast.error("La geolocalizaci├│n no est├í disponible en este navegador");
    return;
  }

   if (watchIdRef.current !== null) {
    navigator.geolocation.clearWatch(watchIdRef.current);
  }
  setIsRouteActive(true);

  watchIdRef.current = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      setLiveUserPosition({
        lat: latitude,
        lng: longitude,
        accuracy,
      });
    },
    () => {
      toast.error("No se pudo obtener tu ubicaci├│n en tiempo real");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

const stopLiveRoute = () => {
  if (watchIdRef.current !== null) {
    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }

  setIsRouteActive(false);
  setLiveUserPosition(null);
  setRouteResult(null);
  setRouteOriginLabel("");
  setRouteDestLabel("");
  setRouteMode("coche");
  setDepartureTime("");
  setIsUserLocation(false);
  toast.info("Ruta finalizada");
};
  
useEffect(() => {
  return () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  };
}, []);

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
          Marca puntos, calcula rutas y define zonas directamente sobre el mapa.
        </p>
      </div>

      <div className="px-6 pb-2">
        {apiError && <p className="text-sm text-red-500">Error backend: {apiError}</p>}
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <aside className="w-[360px] shrink-0 bg-card border border-border rounded-lg p-5 flex flex-col gap-6 overflow-y-auto shadow-[var(--shadow-card)]">
          <MarkersPanel
            markers={markers}
            onRemove={removeMarker}
            onClearAll={() => setMarkers([])}
          />

          <div className="h-px bg-border" />

          <RoutesPanel
            routeResult={routeResult}
            onCalculate={handleRouteCalculated}
            isRouteActive={isRouteActive}
            
            onStartRoute={startLiveRoute}
            onStopRoute={stopLiveRoute}
          />

          {routeResult && !isRouteActive && (
            <button
              onClick={saveRoute}
              className="h-[44px] rounded-md bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar ruta
            </button>
          )}

          <div className="h-px bg-border" />

          <ZonesPanel
            zones={zones}
            isDrawing={isDrawingZone}
            tempZone={tempZone}
            onStartDrawing={() => {
              setIsDrawingZone(true);
              setTempZone([]);
            }}
            onCloseZone={closeZone}
            onCancel={() => {
              setIsDrawingZone(false);
              setTempZone([]);
            }}
            onRemoveZone={(i) => setZones((prev) => prev.filter((_, idx) => idx !== i))}
          />
        </aside>

        <div className="flex-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] overflow-hidden">
          <MapView
            markers={markers}
            places={places}
            routeResult={routeResult}
            originText={routeOriginLabel}
            destText={routeDestLabel}
            isUserLocation={isUserLocation} 
            liveUserPosition={liveUserPosition}
            isRouteActive={isRouteActive}           
            zones={zones}
            tempZone={tempZone}
            isDrawingZone={isDrawingZone}
            onMapClick={handleMapClick}
            onLoadPlaceHours={getPlaceHours}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
