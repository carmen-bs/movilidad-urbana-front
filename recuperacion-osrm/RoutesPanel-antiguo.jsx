import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, Clock, Route as RouteIcon, Car, Footprints, Bike, Bus, TrainFront, Play, Square } from "lucide-react";
import { formatDuration } from "@/utils/formatDuration";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SPEED_KMH = { car: 80, foot: 5, bike: 15 };

const TRANSPORT_MODES = [
  { id: "car", label: "Coche", icon: Car, osrm: "driving", modeKey: "coche" },
  { id: "foot", label: "A pie", icon: Footprints, osrm: "walking", modeKey: "apie" },
  { id: "bike", label: "Bicicleta", icon: Bike, osrm: "cycling", modeKey: "bici" },
  { id: "bus", label: "Autob├║s", icon: Bus, osrm: "", modeKey: "", disabled: true },
  { id: "train", label: "Tren", icon: TrainFront, osrm: "", modeKey: "", disabled: true },
];

function useNominatimSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
        );
        const data = await res.json();
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

function getShortPlaceName(place) {
  if (place.address?.city) return place.address.city;
  if (place.address?.town) return place.address.town;
  if (place.address?.village) return place.address.village;
  if (place.address?.municipality) return place.address.municipality;
  return place.display_name.split(",")[0];
}

const AddressInput = ({ label, placeholder, value, onChange, onSelect, icon: Icon, allowCurrentLocation = false, onUseCurrentLocation, }) => {
  const [focused, setFocused] = useState(false);
  const { results, loading } = useNominatimSearch(value);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-azul" />{label}
      </label>
      <input
        type="text" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)}
        className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all duration-150"
      />
      {focused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
          {allowCurrentLocation && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent/10 transition-colors duration-100 border-b border-border font-medium"
              onClick={() => {
                onUseCurrentLocation?.();
                setFocused(false);
              }}
            >
              Mi ubicaci├│n actual
            </button>
          )}

          {value.length >= 3 && loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando...</div>
          )}

          {value.length >= 3 && !loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
          )}

          {value.length >= 3 && results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors duration-100 border-b border-border last:border-b-0"
              onClick={() => {
                onSelect(r);
                setFocused(false);
              }}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RoutesPanel = ({ routeResult, onCalculate, isRouteActive, onStartRoute, onStopRoute }) => {
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [originCoord, setOriginCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  const [mode, setMode] = useState("car");
  const [departureTime, setDepartureTime] = useState("");
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [isUserLocation, setIsUserLocation] = useState(false);
  
  const handleOriginSelect = useCallback((r) => {
    setOriginText(getShortPlaceName(r));
    setOriginCoord({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setIsUserLocation(false);
  }, []);

  const handleDestSelect = useCallback((r) => {
    setDestText(getShortPlaceName(r));
    setDestCoord({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
  if (!navigator.geolocation) {
    setError("La geolocalizaci├│n no est├í disponible en este navegador");
    return;
  }

  setError("");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      setOriginText("Mi ubicaci├│n actual");
      setOriginCoord({ lat: latitude, lng: longitude });
      setIsUserLocation(true);
    },
    () => {
      setError("No se pudo obtener tu ubicaci├│n");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}, [setError]);

  const calculate = async () => {
    if (!originCoord || !destCoord) {
      setError("Selecciona origen y destino de las sugerencias");
      return;
    }
    setError("");
    setCalculating(true);

    const modeConfig = TRANSPORT_MODES.find((t) => t.id === mode);

    try {
      const url = `https://router.project-osrm.org/route/v1/${modeConfig.osrm}/${originCoord.lng},${originCoord.lat};${destCoord.lng},${destCoord.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        setError("No se ha encontrado una ruta para ese modo");
        return;
      }

      const route = data.routes[0];
      const distKm = Math.round((route.distance / 1000) * 10) / 10;
      const durMin = Math.round((distKm / SPEED_KMH[mode]) * 60);
      const geometry = route.geometry.coordinates.map(
        (c) => [c[1], c[0]]
      );

      const result = { originCoord, destCoord, geometry, distance: distKm, duration: durMin };
      onCalculate(result, originText, destText, modeConfig.modeKey, departureTime, isUserLocation);
    } catch {
      setError("No se ha encontrado una ruta para ese modo");
    } finally {
      setCalculating(false);
    }
  };

  const arrivalTime = (() => {
    if (!departureTime || !routeResult) return null;
    const [h, m] = departureTime.split(":").map(Number);
    const total = h * 60 + m + routeResult.duration;
    const ah = Math.floor(total / 60) % 24;
    const am = total % 60;
    return `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
  })();

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <RouteIcon className="w-4 h-4 text-azul" />
          Rutas
        </h3>

        <AddressInput label="Origen" placeholder="Introduce una direcci├│n o lugar"
          value={originText} onChange={(v) => { setOriginText(v); setOriginCoord(null); setIsUserLocation(false); }}
          onSelect={handleOriginSelect} onUseCurrentLocation={handleUseCurrentLocation}
          allowCurrentLocation={true} icon={MapPin} />

        <AddressInput label="Destino" placeholder="Introduce una direcci├│n o lugar"
          value={destText} onChange={(v) => { setDestText(v); setDestCoord(null); }}
          onSelect={handleDestSelect} icon={Navigation} />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Modo de transporte</span>
          <div className="flex gap-1.5">
            {TRANSPORT_MODES.map((t) => {
              const IconComp = t.icon;
              const isActive = mode === t.id;
              const btn = (
                <button key={t.id} disabled={t.disabled}
                  onClick={() => !t.disabled && setMode(t.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md text-[10px] font-medium transition-all duration-150 border ${
                    t.disabled ? "opacity-40 cursor-not-allowed border-border bg-secondary text-muted-foreground"
                    : isActive ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-foreground hover:border-accent/50"
                  }`}
                >
                  <IconComp className="w-4 h-4" />{t.label}
                </button>
              );
              if (t.disabled) {
                return (
                  <Tooltip key={t.id}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent><p className="text-xs">Disponible en una fase futura</p></TooltipContent>
                  </Tooltip>
                );
              }
              return btn;
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-azul" />
            Hora de salida <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)}
            className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all duration-150" />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button onClick={calculate} disabled={calculating}
          className="h-[44px] rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {calculating ? <span className="animate-pulse">Calculando...</span> : <><RouteIcon className="w-4 h-4" />Calcular ruta</>}
        </button>

        {routeResult && (
          <div className={`rounded-lg p-4 flex flex-col gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${
            isRouteActive
              ? "bg-primary/10 border-2 border-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
              : "bg-accent/5 border border-accent/20"
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                {isRouteActive ? "­ƒƒó Ruta en curso" : "Informaci├│n de la ruta"}
              </h4>
              {isRouteActive && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
                  ACTIVA
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <MapPin className="w-4 h-4 text-accent shrink-0" />
              <span>Distancia: <strong>{routeResult.distance} km</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="w-4 h-4 text-accent shrink-0" />
              <span>Duraci├│n estimada: <strong>{formatDuration(routeResult.duration)}</strong></span>
            </div>
            {arrivalTime && (
              <div className="flex items-center gap-2 text-sm text-foreground pt-1 border-t border-accent/10">
                <Navigation className="w-4 h-4 text-accent shrink-0" />
                <span>Hora estimada de llegada: <strong>{arrivalTime}</strong></span>
              </div>
            )}

            {!isRouteActive ? (
              <button
                onClick={onStartRoute}
className="h-[44px] rounded-md bg-verde-oscuro text-white text-sm font-medium hover:bg-verde transition-colors duration-150 disabled:opacity-60 flex items-center justify-center gap-2"              >
                <Play className="w-4 h-4" />
                Iniciar ruta
              </button>
            ) : (
              <button
                onClick={onStopRoute}
                className="mt-2 h-[44px] rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-all duration-150 flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                Finalizar ruta
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default RoutesPanel;
