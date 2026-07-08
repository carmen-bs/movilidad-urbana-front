import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import RouteTravelsPanel from "@/components/RouteTravelsPanel";
import {
  Route as RouteIcon,
  Search,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";

const RoutesListPage = () => {
  const navigate = useNavigate();
  const { fetchApi } = useApi();

  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Carga de rutas desde el backend al montar el componente
  useEffect(() => {
    const loadRoutesFromTravels = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await fetchApi("/route-travels", {}, true);
        console.log("ROUTE_TRAVELS BACKEND:", data);

        const uniqueRoutesMap = new Map();

        data.forEach((item) => {
          if (!uniqueRoutesMap.has(item.route_id)) {
            uniqueRoutesMap.set(item.route_id, {
              route_id: item.route_id,
              count: 1,
              first_fecha: item.fecha,
              last_fecha: item.fecha,
              sample_viajes_estimados: item.viajes_estimados,
            });
          } else {
            const existingRoute = uniqueRoutesMap.get(item.route_id);
            existingRoute.count += 1;
            existingRoute.last_fecha = item.fecha;
          }
        });

        const uniqueRoutes = Array.from(uniqueRoutesMap.values());
        setRoutes(uniqueRoutes);
      } catch (err) {
        console.error("ERROR ROUTE_TRAVELS:", err);
        setError("Error al cargar las rutas desde route-travels");
      } finally {
        setLoading(false);
      }
    };

    loadRoutesFromTravels();
  }, [fetchApi]);

  // Filtrado de rutas basado en el término de búsqueda
  const filtered = useMemo(() => {
    return routes.filter((route) => {
      if (!search) return true;
      return route.route_id?.toLowerCase().includes(search.toLowerCase());
    });
  }, [routes, search]);

  const selectRouteDetails = (route) => {
    setSelectedRoute(route);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <button
          onClick={() => navigate("/mapa")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al mapa
        </button>

        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
          <RouteIcon className="w-5 h-5 text-accent" />
          Rutas
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Consulta las rutas disponibles y visualiza sus viajes reales y predichos.
        </p>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por route_id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Cargando rutas...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-16">
            <RouteIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay rutas disponibles en route-travels.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <RouteIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No se encontraron rutas para esa búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((route) => (
              <div
                key={route.route_id}
                className={`bg-card border rounded-lg p-5 flex flex-col gap-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow ${
                  selectedRoute?.route_id === route.route_id
                    ? "border-accent ring-1 ring-accent/30"
                    : "border-border"
                }`}
              >
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {route.route_id}
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Primera fecha encontrada:{" "}
                    {route.first_fecha
                      ? new Date(route.first_fecha).toLocaleString()
                      : "No disponible"}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>
                    <strong>route_id:</strong> {route.route_id}
                  </p>
                  <p>
                    <strong>Registros:</strong> {route.count}
                  </p>
                  <p>
                    <strong>Primera fecha:</strong>{" "}
                    {route.first_fecha
                      ? new Date(route.first_fecha).toLocaleString()
                      : "No disponible"}
                  </p>
                  <p>
                    <strong>Última fecha:</strong>{" "}
                    {route.last_fecha
                      ? new Date(route.last_fecha).toLocaleString()
                      : "No disponible"}
                  </p>
                  <p>
                    <strong>Viajes estimados (muestra):</strong>{" "}
                    {route.sample_viajes_estimados ?? "No disponible"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end mt-auto pt-2 border-t border-border gap-2">
                  <button
                    onClick={() => selectRouteDetails(route)}
                    className="h-8 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedRoute && (
          <div className="mt-8 rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold text-foreground mb-2">
              Detalle de la ruta seleccionada
            </h2>

            <p className="text-sm text-muted-foreground mb-4">
              route_id: {selectedRoute.route_id}
            </p>

            <RouteTravelsPanel routeId={selectedRoute.route_id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesListPage;