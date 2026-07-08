import { useEffect, useState } from "react";
import { Route as RouteIcon, Clock } from "lucide-react";
import { useApi } from "@/hooks/useApi";

const RouteTravelsPanel = ({ routeId }) => {
  const { fetchApi } = useApi();

  const [realTravels, setRealTravels] = useState([]);
  const [predTravels, setPredTravels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!routeId) return;

    const loadTravels = async () => {
      try {
        setLoading(true);
        setError("");

        const realData = await fetchApi(`/route-travels/${routeId}`, {}, true);
        const predData = await fetchApi(`/route-travels-pred/${routeId}`, {}, true);

        setRealTravels(realData);
        setPredTravels(predData);
      } catch (err) {
        setError("Error al cargar los viajes de la ruta");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTravels();
  }, [fetchApi, routeId]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
        <RouteIcon className="w-4 h-4 text-accent" />
        Viajes por ruta
      </h3>

      <p className="text-sm text-muted-foreground">
        <strong>route_id:</strong> {routeId}
      </p>

      {loading && <p className="text-sm text-muted-foreground">Cargando datos...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && routeId && (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Viajes reales
            </h4>

            {realTravels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos reales para esta ruta.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto text-sm">
                {realTravels.map((item, index) => (
                  <div
                    key={`real-${index}`}
                    className="py-2 border-b border-border last:border-b-0"
                  >
                    <span className="font-medium">{formatDate(item.fecha)}</span> —{" "}
                    {item.viajes_estimados}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Viajes predichos
            </h4>

            {predTravels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay predicciones para esta ruta.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto text-sm">
                {predTravels.map((item, index) => (
                  <div
                    key={`pred-${index}`}
                    className="py-2 border-b border-border last:border-b-0"
                  >
                    <span className="font-medium">{formatDate(item.fecha)}</span> —{" "}
                    {item.viajes_estimados}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteTravelsPanel;