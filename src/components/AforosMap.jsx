import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

//datos fake 
const USE_FAKE_AFOROS = true;

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