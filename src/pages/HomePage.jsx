import { useState, useEffect } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import RoutesPanel from "@/components/RoutesPanel";
import { useApi } from "@/hooks/useApi";
import ItinerarySummaryPanel from "@/components/ItinerarySummaryPanel";


const HomePage = () => {
  const { fetchApi } = useApi();

  // Lugares cargados desde Supabase mediante la API.
  const [places, setPlaces] = useState([]);

  // Error al conectar con el backend.
  const [apiError, setApiError] = useState("");

  // Ciudad seleccionada en RoutesPanel.
  const [selectedCity, setSelectedCity] = useState("");

  // Lugares de destino seleccionados y visibles en el mapa.
  const [selectedPlaceIds, setSelectedPlaceIds] = useState([]);

  // Fecha elegida para consultar los horarios del lugar.
  const [selectedRouteDate, setSelectedRouteDate] = useState("");

  // Resultado de la ruta calculada por OSRM.
  const [routeResult, setRouteResult] = useState(null);
 
  // Modo con el que finalmente se ha calculado la ruta.
  const [routeMode, setRouteMode] = useState("drive");
  
  // Usuario selecciona su modo de transporte para la ruta.
  const [selectedModes, setSelectedModes] = useState([ "drive", "walk", "bike" ]);

  // Itinerario seleccionado para mostrar su resumen
  const [ selectedItineraryDetail, setSelectedItineraryDetail] = useState(null);

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
    setSelectedItineraryDetail(null);
  };

  // Al cambiar los lugares de destino,
  // elimina la ruta anterior para poder recalcularla.
  const handleChangeSelectedPlaces = (placeIds) => {
    setSelectedPlaceIds(placeIds);
    setRouteResult(null);
    setSelectedItineraryDetail(null);
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
          Planifica tus itinerarios
        </h2>

        <p className="text-sm text-muted-foreground mt-1">
          Selecciona los lugares que quieres visitar y genera diferentes itinerarios adaptados a tus preferencias
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
            selectedModes={selectedModes}
            onSelectedModesChange={setSelectedModes}
            routeResult={routeResult}
            onRouteCalculated={handleRouteCalculated}
            onSelectItinerary={setSelectedItineraryDetail}
            onChangeRouteDate={setSelectedRouteDate}
          />
        </aside>


        {/* MAPA */}
        <div className="flex-1 bg-card border border-border rounded-lg shadow-[var(--shadow-card)] overflow-hidden relative">
          <MapView
            places={selectedPlaces}
            routeResult={routeResult}
            routeMode={routeMode}
            onLoadPlaceHours={getPlaceHours}
            selectedCity={selectedCity}
            selectedDate={selectedRouteDate}
          />

          {selectedItineraryDetail && (
            <ItinerarySummaryPanel
              itinerary={selectedItineraryDetail}
              places={places}
              onClose={() =>
                setSelectedItineraryDetail(null)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;