import { useState, useEffect, useCallback } from "react";
import { getAuthUser, loadJSON } from "@/utils/storage";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import RoutesPanel from "@/components/RoutesPanel";
import { useApi } from "@/hooks/useApi";


// =========================================================
// FUNCIONES AUXILIARES
// =========================================================

// Normaliza textos para comparar nombres de ciudades
// ignorando mayúsculas, minúsculas y acentos.
const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();


// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

const HomePage = () => {
  const authUser = getAuthUser();
  const { fetchApi } = useApi();


  // =========================================================
  // ESTADOS DE LUGARES Y API
  // =========================================================

  // Lugares cargados desde Supabase mediante la API.
  const [places, setPlaces] = useState([]);

  // Error al conectar con el backend.
  const [apiError, setApiError] = useState("");


  // =========================================================
  // ESTADOS DE LA RUTA
  // =========================================================

  // Ciudad seleccionada en RoutesPanel.
  const [selectedCity, setSelectedCity] = useState("");

  // Lugares de destino seleccionados y visibles en el mapa.
  const [selectedPlaceIds, setSelectedPlaceIds] = useState([]);

  // Fecha elegida para consultar los horarios del lugar.
  const [selectedRouteDate, setSelectedRouteDate] = useState("");

  // Resultado de la ruta calculada por OSRM.
  const [routeResult, setRouteResult] = useState(null);

  // Modo real utilizado para calcular la ruta.
  const [routeMode, setRouteMode] = useState("drive");


  // =========================================================
  // ESTADOS DEL MAPA
  // =========================================================

  // Información del punto libre seleccionado en el mapa.
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Zonas guardadas o dibujadas.
  // Las mantenemos para no perder esta funcionalidad del proyecto.
  const [zones, setZones] = useState([]);
  const [isDrawingZone] = useState(false);
  const [tempZone] = useState([]);


  // =========================================================
  // CARGAR LUGARES
  // =========================================================

  // Carga los lugares desde el backend al abrir la página.
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const data = await fetchApi(
          "/places",
          {},
          true
        );

        setPlaces(
          Array.isArray(data) ? data : []
        );

        setApiError("");
      } catch (error) {
        console.error(
          "Error cargando lugares:",
          error
        );

        setPlaces([]);

        setApiError(
          error.message ||
            "Error al cargar los lugares."
        );
      }
    };

    loadPlaces();
  }, [fetchApi]);


  // =========================================================
  // RECUPERAR ZONA SELECCIONADA
  // =========================================================

  // Mantiene la compatibilidad con las zonas guardadas
  // anteriormente en localStorage.
  useEffect(() => {
    const selectedZoneKey =
      `selectedZone:${authUser}`;

    const selectedZone = loadJSON(
      selectedZoneKey,
      null
    );

    if (selectedZone?.points) {
      setZones([
        {
          points: selectedZone.points,
        },
      ]);

      localStorage.removeItem(
        selectedZoneKey
      );
    }
  }, [authUser]);


  // =========================================================
  // INFORMACIÓN DE UN PUNTO DEL MAPA
  // =========================================================

  /**
   * Realiza geocodificación inversa:
   * convierte unas coordenadas pulsadas en el mapa
   * en un nombre y una dirección legible.
   */
  const getPointInfo = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse` +
          `?format=json` +
          `&lat=${lat}` +
          `&lon=${lng}` +
          `&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error(
          `Nominatim respondió con estado ${response.status}`
        );
      }

      const data = await response.json();
      const address = data.address || {};

      const name =
        data.name ||
        address.road ||
        address.neighbourhood ||
        address.suburb ||
        address.city ||
        "Ubicación seleccionada";

      const postalCode =
        address.postcode || "";

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        "";

      const province =
        address.state_district ||
        address.state ||
        "";

      const addressText = [
        postalCode,
        city,
        province,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        lat,
        lng,
        name,
        address:
          addressText ||
          data.display_name ||
          "Dirección no disponible",
      };
    } catch (error) {
      console.error(
        "Error obteniendo información del punto:",
        error
      );

      return {
        lat,
        lng,
        name: "Ubicación seleccionada",
        address: "Dirección no disponible",
      };
    }
  };


  // =========================================================
  // CLIC EN EL MAPA
  // =========================================================

  /**
   * Al pulsar sobre el mapa:
   * - si se estuviera dibujando una zona, se añadiría un punto;
   * - en esta versión muestra información de la ubicación pulsada.
   */
  const handleMapClick = useCallback(
    async (lat, lng) => {
      if (isDrawingZone) {
        return;
      }

      const pointInfo =
        await getPointInfo(lat, lng);

      setSelectedPoint(pointInfo);
    },
    [isDrawingZone]
  );


  // =========================================================
  // HORARIOS DE LUGARES
  // =========================================================

  // Carga los horarios del lugar desde la API.
  const getPlaceHours = async (placeId) => {
    try {
      const data = await fetchApi(
        `/places/${placeId}/hours`,
        {},
        true
      );

      return Array.isArray(data)
        ? data
        : [];
    } catch (error) {
      console.error(
        "Error al cargar horarios:",
        error
      );

      return [];
    }
  };


  // =========================================================
  // RESULTADO DE OSRM
  // =========================================================

  /**
   * RoutesPanel llama a esta función cuando OSRM
   * devuelve correctamente una ruta.
   */
  const handleRouteCalculated = (
    result,
    mode
  ) => {
    setRouteResult(result);
    setRouteMode(mode);
    setSelectedPoint(null);
  };


  // =========================================================
  // CAMBIO DE CIUDAD
  // =========================================================

  // Al cambiar de ciudad:
  // - mueve el mapa a la ciudad;
  // - limpia el destino;
  // - oculta todos los marcadores;
  // - elimina la ruta anterior.
  const handleChangeCity = (city) => {
    setSelectedCity(city);

    // Al cambiar de ciudad se eliminan todos
    // los destinos seleccionados anteriormente.
    setSelectedPlaceIds([]);

    setRouteResult(null);
    setSelectedPoint(null);
  };

  // Al cambiar los lugares de destino,
  // elimina la ruta anterior para poder recalcularla.
  const handleChangeSelectedPlaces = (placeIds) => {
    setSelectedPlaceIds(placeIds);
    setRouteResult(null);
    setSelectedPoint(null);
  };


  // =========================================================
  // LUGARES VISIBLES EN EL MAPA
  // =========================================================

  // Los lugares seleccionados como destino
  // son también los que aparecen en el mapa.
  const selectedPlaces = places.filter((place) =>
    selectedPlaceIds.includes(place.place_id)
  );


  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />


      {/* CABECERA DE LA PÁGINA */}
      <div
        className="px-6 py-6"
        style={{
          background:
            "linear-gradient(180deg, hsl(218 70% 14% / 0.06) 0%, transparent 100%)",
        }}
      >
        <h2 className="text-xl font-bold text-foreground">
          Visualiza rutas y zonas urbanas
        </h2>

        <p className="text-sm text-muted-foreground mt-1">
          Utiliza tu ubicación actual y calcula una ruta
          hasta uno o varios lugares disponibles.
        </p>
      </div>


      {/* ERROR DEL BACKEND */}
      <div className="px-6 pb-2">
        {apiError && (
          <p className="text-sm text-red-500">
            Error backend: {apiError}
          </p>
        )}
      </div>


      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden relative">
        {/* PANEL LATERAL */}
        <aside className="w-[440px] shrink-0 bg-card border border-border rounded-lg p-5 flex flex-col gap-6 overflow-y-auto shadow-[var(--shadow-card)]">
          <RoutesPanel
            selectedCity={selectedCity}
            onChangeCity={handleChangeCity}
            places={places}
            selectedPlaceIds={selectedPlaceIds}
            onChangeSelectedPlaceIds={handleChangeSelectedPlaces}
            routeResult={routeResult}
            onRouteCalculated={handleRouteCalculated}
            onChangeRouteDate={setSelectedRouteDate}
          />
        </aside>


        {/* MAPA */}
        <div className="flex-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] overflow-hidden relative">
          <MapView
            places={selectedPlaces}
            routeResult={routeResult}
            routeMode={routeMode}
            zones={zones}
            tempZone={tempZone}
            isDrawingZone={isDrawingZone}
            onMapClick={handleMapClick}
            onLoadPlaceHours={getPlaceHours}
            itineraryStops={[]}
            selectedCity={selectedCity}
            selectedDate={selectedRouteDate}
          />


          {/* TARJETA DE PUNTO SELECCIONADO */}
          {selectedPoint && !routeResult && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[60%] max-w-md bg-card border border-border rounded-xl shadow-lg p-4 flex items-center justify-between z-[1000]">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {selectedPoint.name}
                </span>

                <span className="text-xs text-muted-foreground">
                  {selectedPoint.address}
                </span>

                <span className="text-xs text-azul mt-1">
                  {selectedPoint.lat.toFixed(6)},{" "}
                  {selectedPoint.lng.toFixed(6)}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPoint(null)
                }
                className="ml-auto text-base text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Cerrar información del punto"
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