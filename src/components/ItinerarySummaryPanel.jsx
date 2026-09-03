import { useMemo } from "react";
import { Bike, BusFront, Car, Clock3, Eye, Footprints, MapPin, X} from "lucide-react";


// MODOS DE TRANSPORTE
const MODE_CONFIG = {
  drive: {
    label: "Coche",
    icon: Car,
    iconClass: "text-verde-oscuro",
    borderClass: "border-verde-oscuro",
  },

  walk: {
    label: "A pie",
    icon: Footprints,
    iconClass: "text-azul",
    borderClass: "border-azul",
  },

  bike: {
    label: "Bicicleta",
    icon: Bike,
    iconClass: "text-orange-500",
    borderClass: "border-orange-500",
  },

  drive_service: {
    label: "Bus",
    icon: BusFront,
    iconClass: "text-purple-500",
    borderClass: "border-purple-500",
  },
};


// Normaliza un texto para comparar nombres ignorando mayúsculas, minúsculas y acentos.
const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();


// Extrae únicamente la hora HH:mm.
const formatTime = (value) => {
  if (!value) {
    return "--:--";
  }

  const text = String(value);

  // Para horas simples como "10:00:00".
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return text.slice(0, 5);
  }

  // Para fechas ISO devueltas por Supabase.
  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid",
    }
  ).format(date);
};


// Convierte minutos en un texto legible.
const formatDuration = (minutes = 0) => {
  const totalMinutes = Math.max(
    0,
    Math.round(Number(minutes) || 0)
  );

  const hours = Math.floor(totalMinutes / 60);

  const remainingMinutes =totalMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
};


// Formatea una distancia recibida en metros.
const formatDistance = (distanceM = 0) => {
  const meters = Math.max(
    0,
    Number(distanceM) || 0
  );

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};


const ItinerarySummaryPanel = ({
  itinerary,
  places = [],
  onClose,
}) => {

  // Ordena las paradas según el orden generado por el backend.
  const orderedRoutes = useMemo(() => {
    return [...(itinerary?.routes || [])]
      .sort(
        (firstRoute, secondRoute) =>
          Number(firstRoute.route_order || 0) -
          Number(secondRoute.route_order || 0)
      );
  }, [itinerary]);


  // Obtiene la primera y la última parada para calcular las horas generales del itinerario.
  const firstRoute = orderedRoutes[0];

  const lastRoute =
    orderedRoutes[
      orderedRoutes.length - 1
    ];


  const startTime = formatTime(
    firstRoute?.arrival_time ||
      itinerary?.start_time
  );

  const endTime = formatTime(
    lastRoute?.visit_end_time
  );

  const rankingPosition =
    itinerary?.ranking_position || 1;


  return (
    <section
      className=" absolute bottom-4 left-1/2 z-[1000] w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-border bg-card p-9 shadow-xl" >
      
      {/* CABECERA*/}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-verde-oscuro text-sm font-bold text-white">
              {rankingPosition}
            </div>

            <h4 className="text-lg font-bold text-foreground">
              Itinerario {rankingPosition}
            </h4>
          </div>


          {/* INFORMACIÓN GENERAL */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />

              {startTime} → {endTime}
            </span>

            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />

              {formatDuration(
                itinerary?.total_time_min
              )}
            </span>

            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-pink-500" />

              {orderedRoutes.length} paradas
            </span>

            <span>
              {formatDistance(
                itinerary?.total_distance_m
              )}
            </span>
          </div>
        </div>


        {/* BOTÓN CERRAR */}
        <button
          type="button"
          onClick={onClose}
          className="
            rounded-md
            p-1
            text-muted-foreground
            transition-colors
            hover:bg-secondary
            hover:text-foreground
          "
          aria-label="Cerrar resumen del itinerario"
        >
          <X className="h-5 w-5" />
        </button>
      </div>


      {/* PARADAS Y DESPLAZAMIENTOS */}

      <div className="mt-4">
        <div className="flex items-center justify-center gap-4">
          {orderedRoutes.map(
            (route, index) => {

              // La información del trayecto entre paradas.
              const connectorRoute = orderedRoutes[index + 1];

              const mode = connectorRoute?.transport_mode ||"walk";

              const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG.walk;

              const ModeIcon = modeConfig.icon;

              // Busca los datos completos del lugar para recuperar su imagen.
              const place = places.find(
                (currentPlace) => {
                  const currentId = currentPlace.place_id ?? currentPlace.id;

                  if (
                    currentId === route.place_id
                  ) {
                    return true;
                  }

                  return (
                    normalizeText(
                      currentPlace.name
                    ) ===
                    normalizeText(
                      route.place_name
                    )
                  );
                }
              );

              const imageUrl = place?.image_url || place?.img_url || place?.img || "/placeholder-place.jpg";

              return (
                <div
                  key={ route.id || route.place_id || index }
                  className="flex shrink-0 items-center gap-4"
                >
                  {/* TARJETA DEL LUGAR */}

                  <article
                    className=" w-[220px] min-w-[220px] rounded-xl border border-border bg-card p-3 shadow-sm " >

                    {/* IMAGEN */}
                    <div className="relative">
                      <img src={imageUrl} alt={route.place_name} className=" h-28 w-full rounded-lg object-cover " />

                      {/* LETRA A, B, C... */}
                      <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-verde-oscuro text-xs font-bold text-white">
                        {String.fromCharCode(
                          65 + index
                        )}
                      </div>
                    </div>

                    {/* NOMBRE */}
                    <p className="mt-2 min-h-[40px] text-xs font-semibold leading-5 text-foreground">
                      {route.place_name}
                    </p>

                    {/* DATOS DE LA PARADA */}
                    <div className="mt-3 space-y-2 text-[11px]">

                      {/* LLEGADA */}
                      <div
                        className={` flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                            index === 0
                              ? "bg-green-50 text-verde-oscuro"
                              : "bg-blue-50 text-azul"
                          }
                        `}
                      >
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />

                        <span className="font-semibold">
                          Llegada{" "}
                          {formatTime(
                            route.arrival_time
                          )}
                        </span>
                      </div>

                      {/* TIEMPO DE VISITA */}
                      <div className="flex flex-col items-center border-t border-border pt-2 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Tiempo de visita
                        </span>

                        <span className="mt-1 font-semibold text-foreground">
                          {formatTime(
                            route.visit_start_time
                          )}
                          {" - "}
                          {formatTime(
                            route.visit_end_time
                          )}
                        </span>
                      </div>

                      {/* SALIDA */}
                      <div
                        className={` flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                            index === 0
                              ? "bg-green-50 text-verde-oscuro"
                              : "bg-blue-50 text-azul"
                          }
                        `}
                      >
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />

                        <span className="font-semibold">
                          Salida{" "}
                          {formatTime(
                            route.visit_end_time
                          )}
                        </span>
                      </div>
                    </div>
                  </article>


                  {/* CONECTOR ENTRE PARADAS */}
                  {connectorRoute && (
                    <div className="flex w-[90px] flex-col items-center text-xs text-muted-foreground">                      
                    <ModeIcon className={` mb-1 h-5 w-5 ${modeConfig.iconClass} `} />

                      <div
                        className={` mb-1 w-full border-t-2 border-dotted ${modeConfig.borderClass} `}
                      />

                      <span>
                        {formatDuration(connectorRoute.travel_time_min )}
                      </span>

                      <span>
                        {formatDistance(connectorRoute.distance_m)}
                      </span>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>


      {/* INFERIOR */}
      <div
        className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-verde-claro/40 bg-verde-claro/10 p-3 text-xs lg:grid-cols-4 "
      >
        <div>
          <p className="text-muted-foreground"> Hora de inicio </p>
          <p className="font-semibold text-foreground"> {startTime} </p>
        </div>

        <div>
          <p className="text-muted-foreground">Hora de fin </p>
          <p className="font-semibold text-foreground"> {endTime} </p>
        </div>

        <div>
          <p className="text-muted-foreground"> Duración total </p>
          <p className="font-semibold text-foreground"> {formatDuration(itinerary?.total_time_min)}</p>
        </div>

        <div>
          <p className="text-muted-foreground"> Distancia total </p>
          <p className="font-semibold text-foreground"> {formatDistance( itinerary?.total_distance_m)} </p>
        </div>
      </div>
    </section>
  );
};

export default ItinerarySummaryPanel;