import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

//datos fake 
const USE_FAKE_AFOROS = true;
const mockAforos = {
  //Alicante
  "0301401": 12000, // Centro / costa Alicante → máximo
  "0301402": 7600,  // zona urbana cercana
  "0301403": 12000, // zona urbana media
  "0301404": 2600,  // alrededores ciudad
  "0301405": 1700,  // interior medio
  "0301406":1000,   // interior bajo-medio
  "0301407": 2400,  // periferia baja
  "0301408": 220,   // zona menos concurrida

  // Valencia
  "4625001": 15000, // zona urbana máxima
  "4625002": 9500,  // zona urbana media
  "4625003": 7000,  // zona urbana baja
  "4625004": 4200,  // alrededores ciudad
  "4625005": 2800,  // interior medio
  "4625006": 11000, // centro ciudad
  "4625007": 6500, 
  "4625008": 3500,
  "4625009": 1800,
  "4625010": 5200,  // centro costa
  "4625011": 8000, // puerto
  "4625012": 3000,
  "4625013": 2200,
  "4625014": 13000,
  "4625015": 4800,
  "4625016": 9000,
  "4625017": 3600,
  "4625018": 6000,
  "4625019": 1600, // parque l'albufera

  // Jávea
  "0308201": 12000, //centro
  "0308202": 6500,  // zona urbana
  "0308203": 2800,  // alrededores

  // Torrevieja
  "0313301": 11000, // centro
  "0313302": 3200,  // laguna
  "0313303": 7000,  // costa
};

// Convertimos nº de personas → color
const getColor = (personas) => {
  if (personas > 10000) return "#7f0000";
  if (personas > 5000) return "#bd0026";
  if (personas > 2000) return "#f03b20";
  if (personas > 1000) return "#fd8d3c";
  if (personas > 500) return "#feb24c";
  if (personas > 200) return "#fed976";
  return "#ffffcc";
};

const AforosMap = ({ city, date, hour }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const alertMarkersRef = useRef(null);
  const [error, setError] = useState(null);

  // 1. Crear mapa 
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // cenralizamos en españa
    mapInstanceRef.current = L.map(mapRef.current).setView([40.4168, -3.7038], 5);

    // fonfo (openStreetMap )
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "Leaflet | © OpenStreetMap",
    }).addTo(mapInstanceRef.current);

    alertMarkersRef.current = L.layerGroup().addTo(mapInstanceRef.current);

  }, []);

  // 2. Cargar el GeoJSON correspondiente a la ciudad seleccionada
  useEffect(() => {
    const loadDistricts = async () => {
      if (!city || !date || !hour || !mapInstanceRef.current) return;

      const archivosGeoJSON = {
        Alicante: "/data/alicante_distritos.geojson",
        Valencia: "/data/valencia_distritos.geojson",
        Jávea: "/data/javea_distritos.geojson",
        Javea: "/data/javea_distritos.geojson",
        Torrevieja: "/data/torrevieja_distritos.geojson",
      };
      
      const ciudadNormalizada =
        city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

      const archivo = archivosGeoJSON[ciudadNormalizada];

      if (!archivo) {
        setError(`No hay un GeoJSON disponible para ${city}.`);
        return;
      }

      try {
        const response = await fetch(archivo);

        if (!response.ok) {
          throw new Error("No se ha podido cargar el GeoJSON.");
        }

        const geojson = await response.json();

        setError(null);

        // Elimina la capa anterior
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.remove();
        }

        // Elimina los marcadores de alerta anteriores
        if (alertMarkersRef.current) {
          alertMarkersRef.current.clearLayers();
        }

        // Crea la nueva capa de distritos
        geoJsonLayerRef.current = L.geoJSON(geojson, {
          style: (feature) => {
            const ineMun = feature.properties.INE_MUN;
            const distrito = feature.properties.DISTRITO;

            const id = `${ineMun}${String(distrito).padStart(2, "0")}`;
              console.log("Distrito:", {
                ineMun,
                distrito,
                id,
                personas: mockAforos[id] || 0,
              });
              const personas = USE_FAKE_AFOROS
              ? mockAforos[id] || 0
              : feature.properties.personas_estimadas || 0;

            return {
              fillColor: getColor(personas),
              weight: 1,
              color: "#ffffff",
              fillOpacity: 0.7,
            };
          },

          onEachFeature: (feature, layer) => {
            const ineMun = feature.properties.INE_MUN;
            const distrito = feature.properties.DISTRITO;

            const id = `${ineMun}${String(distrito).padStart(2, "0")}`;

            const personas = USE_FAKE_AFOROS
              ? mockAforos[id] || 0
              : feature.properties.personas_estimadas || 0;

            layer.bindPopup(`
              <strong>Distrito ${distrito}</strong><br/>
              Personas aprox.: ${Math.round(personas)}
            `);

            if (personas > 10000) {
              const center = layer.getBounds().getCenter();

              const alertIcon = L.divIcon({
                className: "",
                html: `<div style="font-size: 14px;">⚠️</div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              });

              L.marker(center, {
                icon: alertIcon,
              }).addTo(alertMarkersRef.current);
            }
          },
        }).addTo(mapInstanceRef.current);

        // Ajusta el zoom a los distritos cargados
        const bounds = geoJsonLayerRef.current.getBounds();

        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [20, 20],
          });
        }
      } catch (err) {
        setError(err.message);
      }
    };

    loadDistricts();
  }, [city, date, hour]);

  return (
    <div className="relative w-full h-full">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
            ⚠️ {error}
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </div>
  );
};

export default AforosMap;