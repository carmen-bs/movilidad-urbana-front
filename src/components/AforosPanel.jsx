import { MapPin, CalendarDays, Clock, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import AforosMap from "@/components/AforosMap";
import { useApi } from "@/hooks/useApi";

// Función para los colores de los niveles de volumen de personas
const getNivelClass = (nivel) => {
  switch (nivel) {
    case "Muy Alto":
      return "bg-red-900 text-red-100";
    case "Alto":
      return "bg-red-500 text-white";
    case "Medio":
      return "bg-orange-500 text-white";
    case "Bajo":
      return "bg-yellow-400 text-yellow-950";
    default:
      return "bg-[#9ADE88]/40 text-[#0E448F]";
  }
};

const ALL_CITIES = [
  { value: "alicante", label: "Alicante" },
  { value: "valencia", label: "Valencia" },
  { value: "javea", label: "Jávea" },
  { value: "torrevieja", label: "Torrevieja" },
];

// Estados de los filtros seleccionados (ciudad, fecha, hora) y el botón para aplicar los filtros y mostrar el mapa con los datos correspondientes
const AforosPanel = () => {
  const { fetchApi } = useApi();
  const [availableCities] = useState(ALL_CITIES);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState("");
  const [aforos, setAforos] = useState([]);
  
  // Estado para guardar filtros aplicados y mostrar el mapa solo cuando se hayan aplicado los filtros
  const [appliedFilters, setAppliedFilters] = useState({
    city: "",
    date: "",
    hour: "",
  });

  // boton "ver aforos"
  const handleViewAforos = () => {
    if (!selectedCity || !selectedDate || !selectedHour) {
      alert("Selecciona ciudad, fecha y hora antes de ver los aforos.");
      return;
    }

    // Aplicamos filtros y mostramos en el mapa
    setAppliedFilters({
      city: selectedCity,
      date: selectedDate,
      hour: selectedHour,
    });
  };

  // Info de las tablas
  useEffect(() => {
    if (
      !appliedFilters.city ||
      !appliedFilters.date ||
      !appliedFilters.hour
    ) {
      setAforos([]);
      return;
    }

    const cargarAforos = async () => {
      try {
        const ciudadNormalizada =
          appliedFilters.city.toLowerCase() === "javea"
            ? "Jávea"
            : appliedFilters.city.charAt(0).toUpperCase() +
              appliedFilters.city.slice(1).toLowerCase();

        const datos = await fetchApi(
          `/aforos?city=${encodeURIComponent(
            ciudadNormalizada
          )}&date=${appliedFilters.date}&hour=${encodeURIComponent(
            appliedFilters.hour
          )}`,
          {},
          true
        );

        console.log("Aforos para las tablas:", datos);
        console.log("PRIMER REGISTRO:", datos[0]);
        console.log("ES_PREDICCION:", datos.map((a) => a.es_prediccion));
        console.log("FECHAS:", datos.map((a) => a.fecha));
        console.log("HORAS:", datos.map((a) => a.hora));
        setAforos(datos);
      } catch (error) {
        console.error("Error cargando aforos para las tablas:", error);
        setAforos([]);
      }
    };

    cargarAforos();
  }, [appliedFilters, fetchApi]);

  const calcularNivel = (personas) => {
    if (personas > 10000) return "Muy Alto";
    if (personas > 5000) return "Alto";
    if (personas > 2000) return "Medio";
    if (personas > 1000) return "Medio";
    if (personas > 500) return "Bajo";
    return "Bajo";
  };

  const zonasPermitidas = ["Centro", "Costa", "Interior"];

  // Datos reales: misma fecha y hora seleccionadas
 const aforosReales = aforos.filter(
  (aforo) => aforo.es_prediccion === false
  );

  const calcularHoraPrediccion = (hora) => {
    const [horas, minutos] = hora.split(":").map(Number);
    const totalMinutos = horas * 60 + minutos + 120;

    const minutosFinales = totalMinutos % 60;
    const horasFinales = Math.floor(totalMinutos / 60) % 24;

    return `${String(horasFinales).padStart(2, "0")}:${String(
      minutosFinales
    ).padStart(2, "0")}`;
  };

  const horaPrediccion = calcularHoraPrediccion(appliedFilters.hour);

  const aforosPrediccionDatos = aforos.filter(
    (aforo) => aforo.es_prediccion === true
  );

  const agruparPorZona = (datos) =>
    Object.values(
      datos.reduce((zonas, aforo) => {
        const zona = aforo.zona;

        if (!zonasPermitidas.includes(zona)) {
          return zonas;
        }

        if (!zonas[zona]) {
          zonas[zona] = {
            distrito: zona,
            personas: 0,
          };
        }

        zonas[zona].personas += aforo.personas || 0;

        return zonas;
      }, {})
    );

  const aforosPorZonaReal = agruparPorZona(aforosReales);
  const aforosPorZonaPrediccion = agruparPorZona(aforosPrediccionDatos);

  const aforosTiempoReal = aforosPorZonaReal.map((zona) => ({
    distrito: zona.distrito,
    personas: zona.personas,
    nivel: calcularNivel(zona.personas),
    hora: appliedFilters.hour,
  }));

  const aforosPrediccion = aforosPorZonaPrediccion.map((zona) => ({
    distrito: zona.distrito,
    personas: zona.personas,
    nivel: calcularNivel(zona.personas),
    hora: horaPrediccion,
  }));

  return (
    <div className="flex flex-col gap-5 text-foreground">
      {/* TÍTULO */}
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-[#0E448F]" />
        <h2 className="text-xl font-bold text-[#0E448F]">
          Aforos en Tiempo Real
        </h2>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* CIUDAD */}
        <div className="rounded-xl bg-[#9ADE88]/30 border border-[#5B8B6C]/40 h-[48px] px-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#5B8B6C]" />
          <div className="flex-1 flex flex-col justify-center">
            <label className="text-xs text-[#5B8B6C]">Provincia</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-transparent font-medium text-sm outline-none cursor-pointer text-[#0E448F]"
            >
              <option value="">Selecciona provincia</option>
              {availableCities.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FECHA */}
        <div className="rounded-xl bg-[#9ADE88]/30 border border-[#5B8B6C]/40 h-[48px] px-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#5B8B6C]" />
          <div className="flex-1 flex flex-col justify-center">
            <label className="text-xs text-[#5B8B6C]">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent font-medium text-sm outline-none cursor-pointer text-[#0E448F]"
            />
          </div>
        </div>

        {/* HORA */}
        <div className="rounded-xl bg-[#9ADE88]/30 border border-[#5B8B6C]/40 h-[48px] px-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#5B8B6C]" />
          <div className="flex-1 flex flex-col justify-center">
            <label className="text-xs text-[#5B8B6C]">Hora</label>
            <input
              type="time"
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="w-full bg-transparent font-medium text-sm outline-none cursor-pointer text-[#0E448F]"
            />
          </div>
        </div>

        {/* BOTÓN VER AFOROS */}
        <button
          onClick={handleViewAforos}
          className="h-[48px] px-4 rounded-xl bg-[#1A6BAB] hover:bg-[#0E448F] text-white text-sm font-semibold shadow-sm transition-colors"
        >
          Ver aforos
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* MAPA */}
        <div className="min-h-[320px] rounded-2xl border border-[#D6E5DB] shadow-md bg-[#F3F8F4] relative overflow-hidden">
          <AforosMap
            city={appliedFilters.city}
            date={appliedFilters.date}
            hour={appliedFilters.hour}
          />
        </div>

        {/* LEYENDA + ALERTA */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#9ADE88]/60 bg-[#DFF2D4] p-4 shadow-md">
            <h3 className="text-sm font-semibold mb-3 text-[#0E448F]">
              Nivel de Aforo (personas)
            </h3>

            <div className="flex flex-col gap-2 text-xs">
              {[
                ["bg-yellow-100", "0 – 200"],
                ["bg-yellow-300", "200 – 500"],
                ["bg-orange-300", "500 – 1000"],
                ["bg-orange-400", "1000 – 2000"],
                ["bg-red-500", "2000 – 5000"],
                ["bg-red-700", "5000 – 10000"],
                ["bg-red-950", "10000+"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full ${color}`} />
                  <span className="text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ALERTA */}
          <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-100/70 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-semibold text-yellow-800">
                Zonas con alta afluencia
              </h3>
            </div>

            <p className="text-sm text-yellow-800/80">
              Existen zonas con niveles de aforo altos. Se recomienda extremar precauciones.
            </p>
          </div>
        </div>
      </div>

      {/* TABLAS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AforoTable
          title="Aforos Descriptivos (Tiempo Real)"
          icon={<Users className="w-4 h-4 text-[#1A6BAB]" />}
          rows={aforosTiempoReal}
          prediction={false}
        />

        <AforoTable
          title="Predicción de Aforos"
          icon={<TrendingUp className="w-4 h-4 text-[#1A6BAB]" />}
          rows={aforosPrediccion}
          prediction
        />
      </div>

      <p className="text-xs text-slate-500">
        Los datos de aforo son estimaciones. La predicción muestra una estimación para las 2 horas posteriores a la hora seleccionada.
      </p>
    </div>
  );
};

// Componenete tabla
const AforoTable = ({ title, icon, rows, prediction }) => (
  <div className="rounded-2xl border border-[#9ADE88]/60 bg-[#EEF8E9] overflow-hidden shadow-md">
    <div className="px-4 py-3 border-b border-[#9ADE88]/60 bg-[#DFF2D4] flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-semibold text-[#0E448F]">{title}</h3>
    </div>

    {/* TABLA */}
    <table className="w-full text-sm">
      <thead className="bg-[#CDEAC0] text-[#0E448F]">
        <tr>
         <th className="text-left px-4 py-3">Zona</th>
         <th className="text-left px-4 py-3">Personas</th>
         <th className="text-left px-4 py-3">
            {prediction ? "Nivel previsto" : "Nivel de aforo"}
         </th>
          <th className="text-left px-4 py-3">Hora</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr
            key={`${row.distrito}-${row.hora}`}
            className="border-t border-[#D6E5DB]/70 hover:bg-[#9ADE88]/10 transition-colors"
          >
            <td className="px-4 py-3">{row.distrito}</td>
            <td className="px-4 py-3">
              {row.personas.toLocaleString("es-ES")}
            </td>
            <td className="px-4 py-3">
              <span className={`px-3 py-1 rounded-md text-xs font-semibold ${getNivelClass(row.nivel)}`}>
                {row.nivel}
              </span>
            </td>

            <td className="px-4 py-3">{row.hora}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AforosPanel;