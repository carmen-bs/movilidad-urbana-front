import { useMemo, useState } from "react";
import {
  Route as RouteIcon,
  Car,
  Footprints,
  Bike,
  BusFront,
  Sparkles,
  MapPin,
  Navigation,
  LocateFixed,
  Clock,
} from "lucide-react";


// =========================================================
// MODOS DE TRANSPORTE
// =========================================================

// Mantenemos los mismos identificadores utilizados en la API
// y en el resto del frontend.
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

// Modos que se intentarán comprobar cuando el usuario seleccione "Mejor".
const ROUTABLE_MODES = ["drive", "walk", "bike"];

// Traducción de los identificadores para mostrarlos en la interfaz.
const MODE_LABELS = {
  good: "Mejor opción",
  drive: "Coche",
  walk: "A pie",
  bike: "Bicicleta",
  drive_service: "Bus",
};


// =========================================================
// CIUDADES
// =========================================================

// Lista de ciudades disponibles actualmente en la aplicación.
const ALL_CITIES = [
  { value: "alicante", label: "Alicante" },
  { value: "javea", label: "Jávea" },
  { value: "valencia", label: "Valencia" },
  { value: "torrevieja", label: "Torrevieja" },
];


// =========================================================
// FUNCIONES AUXILIARES
// =========================================================

// Normaliza textos para comparar ciudades ignorando
// mayúsculas, minúsculas y acentos.
const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();


// Formatea una duración en minutos.
// Ejemplos:
// 35 → "35 min"
// 90 → "1 h 30 min"
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


// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

const RoutesPanel = ({
  selectedCity,
  onChangeCity,
  places = [],
  selectedPlaceId,
  onChangeSelectedPlaceId,
  visiblePlaceIds = [],
  onChangeVisiblePlaceIds,
  routeResult,
  onRouteCalculated,
  onChangeRouteDate,
}) => {

  // Coordenadas reales del usuario.
  const [originCoord, setOriginCoord] = useState(null);

  // Modo de transporte seleccionado.
  const [mode, setMode] = useState("good");

  // Fecha seleccionada para consultar los horarios del destino.
  const [date, setDate] = useState("");

  // Estados de carga.
  const [locating, setLocating] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Mensaje de validación o error.
  const [error, setError] = useState("");


  // =========================================================
  // LUGARES DE LA CIUDAD SELECCIONADA
  // =========================================================

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


  // Obtiene el objeto completo del lugar seleccionado.
  const selectedPlace = useMemo(() => {
    return (
      cityPlaces.find(
        (place) => place.place_id === selectedPlaceId
      ) || null
    );
  }, [cityPlaces, selectedPlaceId]);


  // =========================================================
  // CAMBIO DE CIUDAD
  // =========================================================

  const handleChangeCity = (city) => {
    // Informa a HomePage de la nueva ciudad.
    onChangeCity?.(city);

    // Limpia el destino anterior.
    onChangeSelectedPlaceId?.("");

    // Oculta los lugares de la ciudad anterior.
    onChangeVisiblePlaceIds?.([]);

    setError("");
  };

  // Muestra u oculta un lugar en el mapa.
  const togglePlaceVisibility = (placeId) => {
    if (visiblePlaceIds.includes(placeId)) {
      onChangeVisiblePlaceIds?.(
        visiblePlaceIds.filter(
          (currentId) => currentId !== placeId
        )
      );
    } else {
      onChangeVisiblePlaceIds?.([
        ...visiblePlaceIds,
        placeId,
      ]);
    }
  };

  // =========================================================
  // GEOLOCALIZACIÓN
  // =========================================================

  // Obtiene la ubicación real del usuario mediante el navegador.
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "La geolocalización no está disponible en este navegador."
      );
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      // La ubicación se ha obtenido correctamente.
      (position) => {
        const { latitude, longitude } = position.coords;

        setOriginCoord({
          lat: latitude,
          lng: longitude,
        });

        setLocating(false);
      },

      // No se ha podido obtener la ubicación.
      (geolocationError) => {
        console.error(
          "Error obteniendo la ubicación:",
          geolocationError
        );

        setError(
          "No se pudo obtener tu ubicación. Comprueba los permisos del navegador."
        );

        setLocating(false);
      },

      // Opciones de geolocalización.
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };


  // =========================================================
  // PETICIÓN DE RUTA A OSRM
  // =========================================================

  /**
   * Solicita a OSRM una ruta entre dos coordenadas.
   *
   * routeMode:
   * - drive
   * - walk
   * - bike
   *
   * Devuelve:
   * - modo utilizado
   * - ruta devuelta por OSRM
   */
  const requestOsrmRoute = async (
    routeMode,
    origin,
    destination
  ) => {
    // Busca la configuración correspondiente al modo.
    const modeConfig = TRANSPORT_MODES.find(
      (transportMode) => transportMode.id === routeMode
    );

    if (!modeConfig?.osrmProfile) {
      throw new Error(
        `El modo ${routeMode} no tiene un perfil OSRM configurado.`
      );
    }

    // OSRM espera las coordenadas en formato:
    // longitud,latitud;longitud,latitud
    const coordinates =
      `${origin.lng},${origin.lat};` +
      `${destination.lng},${destination.lat}`;

    // Construye la URL de la petición.
    const url =
      `https://router.project-osrm.org/route/v1/` +
      `${modeConfig.osrmProfile}/${coordinates}` +
      "?overview=full&geometries=geojson&steps=false";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `OSRM respondió con estado ${response.status}.`
      );
    }

    const data = await response.json();

    // Comprueba que OSRM haya encontrado al menos una ruta.
    if (
      data.code !== "Ok" ||
      !Array.isArray(data.routes) ||
      data.routes.length === 0
    ) {
      throw new Error(
        data.message ||
          `No se encontró una ruta para el modo ${routeMode}.`
      );
    }

    return {
      mode: routeMode,
      route: data.routes[0],
    };
  };


  // =========================================================
  // CALCULAR RUTA
  // =========================================================

  const handleCalculateRoute = async () => {
    setError("");

    // Comprueba que el usuario haya compartido su ubicación.
    if (!originCoord) {
      setError(
        "Primero debes obtener tu ubicación actual."
      );
      return;
    }

    // Comprueba que haya seleccionado un destino.
    if (!selectedPlace) {
      setError(
        "Selecciona un lugar de destino."
      );
      return;
    }

    // El autobús queda desactivado en esta primera versión.
    if (mode === "drive_service") {
      setError(
        "Las rutas de autobús todavía no están disponibles."
      );
      return;
    }

    // Convierte las coordenadas de Supabase a números.
    const destination = {
      lat: Number(selectedPlace.lat),
      lng: Number(selectedPlace.lon),
    };

    // Comprueba que el destino tenga coordenadas válidas.
    if (
      !Number.isFinite(destination.lat) ||
      !Number.isFinite(destination.lng)
    ) {
      setError(
        "El lugar seleccionado no tiene coordenadas válidas."
      );
      return;
    }

    setCalculating(true);

    try {
      let selectedResult;

      // Si el usuario selecciona "Mejor", intenta calcular
      // coche, paseo y bicicleta.
      if (mode === "good") {
        const results = await Promise.allSettled(
          ROUTABLE_MODES.map((routeMode) =>
            requestOsrmRoute(
              routeMode,
              originCoord,
              destination
            )
          )
        );

        // Conserva únicamente las peticiones que hayan funcionado.
        const validResults = results
          .filter(
            (result) => result.status === "fulfilled"
          )
          .map((result) => result.value)
          .sort(
            (firstResult, secondResult) =>
              firstResult.route.duration -
              secondResult.route.duration
          );

        if (validResults.length === 0) {
          throw new Error(
            "No se encontró ninguna ruta disponible."
          );
        }

        // Selecciona la ruta con menor duración.
        selectedResult = validResults[0];
      } else {
        // Calcula solamente el modo seleccionado.
        selectedResult = await requestOsrmRoute(
          mode,
          originCoord,
          destination
        );
      }

      const {
        route,
        mode: calculatedMode,
      } = selectedResult;

      // Estructura que utilizará HomePage y MapView.
      const result = {
        segments: [
          {
            geometry: route.geometry,
            mode: calculatedMode,
          },
        ],

        originCoord,

        destCoord: destination,

        originLabel: "Mi ubicación actual",

        destinationLabel: selectedPlace.name,

        // OSRM devuelve la distancia en metros.
        distance:
          Math.round(
            (route.distance / 1000) * 10
          ) / 10,

        // OSRM devuelve la duración en segundos.
        duration:
          Math.round(route.duration / 60),

        calculatedMode,
      };

      // Envía la ruta calculada al componente HomePage.
      onRouteCalculated?.(
        result,
        calculatedMode
      );
    } catch (routeError) {
      console.error(
        "Error calculando la ruta:",
        routeError
      );

      setError(
        "No se pudo calcular la ruta para el modo seleccionado."
      );
    } finally {
      setCalculating(false);
    }
  };


      // =========================================================
  // INTERFAZ
  // =========================================================

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
            const isActive = mode === transportMode.id;

            return (
              <button
                key={transportMode.id}
                type="button"
                disabled={transportMode.disabled}
                onClick={() => {
                  setMode(transportMode.id);
                  setError("");
                }}
                title={
                  transportMode.disabled
                    ? "Disponible próximamente"
                    : transportMode.label
                }
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


      {/* ORIGEN */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-azul" />
          Origen
        </label>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className={`h-[46px] rounded-xl border px-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
            originCoord
              ? "border-verde-oscuro bg-verde-claro/20 text-verde-oscuro"
              : "border-border bg-card text-foreground hover:border-azul/50"
          } disabled:opacity-60`}
        >
          <LocateFixed className="w-4 h-4" />

          {locating
            ? "Obteniendo ubicación..."
            : originCoord
              ? "Ubicación obtenida"
              : "Usar mi ubicación actual"}
        </button>

        {/* Coordenadas obtenidas */}
        {originCoord && (
          <p className="text-xs text-muted-foreground">
            {originCoord.lat.toFixed(6)},{" "}
            {originCoord.lng.toFixed(6)}
          </p>
        )}
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

          {/* LUGARES VISIBLES EN EL MAPA */}
{selectedCity && cityPlaces.length > 0 && (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
      Lugares visibles en el mapa
    </label>

    <div className="rounded-xl border border-border bg-card p-3 max-h-[180px] overflow-y-auto flex flex-col gap-2">
      {cityPlaces.map((place) => (
        <label
          key={place.place_id}
          className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
        >
          <input
            type="checkbox"
            checked={visiblePlaceIds.includes(
              place.place_id
            )}
            onChange={() =>
              togglePlaceVisibility(
                place.place_id
              )
            }
            className="w-4 h-4 accent-verde-oscuro"
          />

          <span>{place.name}</span>
        </label>
      ))}
    </div>
  </div>
)}

      {/* LUGAR DE DESTINO */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-azul" />
          Lugar de destino
        </label>

        <select
          value={selectedPlaceId || ""}
          disabled={!selectedCity}
          onChange={(event) => {
          const placeId = event.target.value;

            // Guarda el destino seleccionado.
            onChangeSelectedPlaceId?.(placeId);

            // Al seleccionar un destino, muestra automáticamente
            // ese lugar en el mapa y marca su checkbox.
            if (
              placeId &&
              !visiblePlaceIds.includes(placeId)
            ) {
              onChangeVisiblePlaceIds?.([
                ...visiblePlaceIds,
                placeId,
              ]);
            }

            setError("");
          }}
          className="h-[48px] rounded-2xl border border-border bg-white px-4 pr-10 text-sm text-foreground shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-azul/30 hover:border-azul/40 disabled:opacity-50"
        >
          <option value="">
            {selectedCity
              ? "Selecciona un lugar"
              : "Selecciona primero una ciudad"}
          </option>

          {cityPlaces.map((place) => (
            <option
              key={place.place_id}
              value={place.place_id}
            >
              {place.name}
            </option>
          ))}
        </select>
      </div>


      {/* FECHA DE VISITA */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-azul" />
          Fecha de visita

          <span className="font-normal normal-case text-muted-foreground">
            (opcional)
          </span>
        </label>

        <input
          type="date"
          value={date}
          min={new Date().toISOString().split("T")[0]}
          onChange={(event) => {
            const selectedDate = event.target.value;

            setDate(selectedDate);
            onChangeRouteDate?.(selectedDate);
          }}
          className="h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground"
        />
      </div>


      {/* ERROR */}
      {error && (
        <p className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}


      {/* BOTÓN CALCULAR */}
      <button
        type="button"
        onClick={handleCalculateRoute}
        disabled={
          calculating ||
          locating ||
          !originCoord ||
          !selectedPlaceId
        }
        className="h-[44px] rounded-md bg-verde text-white text-sm font-medium hover:bg-verde-oscuro transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RouteIcon className="w-4 h-4" />

        {calculating
          ? "Calculando..."
          : "Calcular ruta"}
      </button>


      {/* INFORMACIÓN DE LA RUTA */}
      {routeResult && (
        <div className="rounded-xl border border-verde-claro bg-verde-claro/10 p-4 flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase text-foreground">
            Información de la ruta
          </h4>

          <p className="text-sm text-foreground">
            <strong>Destino:</strong>{" "}
            {routeResult.destinationLabel ||
              "Lugar seleccionado"}
          </p>

          <p className="text-sm text-foreground">
            <strong>Modo:</strong>{" "}
            {MODE_LABELS[
              routeResult.calculatedMode
            ] ||
              routeResult.calculatedMode ||
              "No disponible"}
          </p>

          <p className="text-sm text-foreground">
            <strong>Distancia:</strong>{" "}
            {routeResult.distance} km
          </p>

          <p className="text-sm text-foreground">
            <strong>Duración estimada:</strong>{" "}
            {formatDuration(routeResult.duration)}
          </p>
        </div>
      )}
    </div>
  );
};
export default RoutesPanel;