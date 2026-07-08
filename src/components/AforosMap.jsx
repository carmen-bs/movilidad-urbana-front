import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApi } from "@/hooks/useApi";

//datos fake 
const USE_FAKE_AFOROS = true;
//datos fake
const mockAforos = {
  "0301401": 12000, // Centro / costa Alicante → máximo
  "0301402": 7600,  // zona urbana cercana
  "0301403": 12000,  // zona urbana media
  "0301404": 2600,  // alrededores ciudad
  "0301405": 1700,  // interior medio
  "0301406":1000,   // interior bajo-medio
  "0301407": 2400,   // periferia baja
  "0301408": 220,   // zona menos concurrida
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
  const { fetchApi } = useApi();
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

  // 2. Cargar GeoJSON y pintar distritos cada vez que cambie la ciudad
  useEffect(() => {
    const loadDistricts = async () => {
        if (!city || !date || !hour || !mapInstanceRef.current) return;

      // llamada a api para cargar geojson de distritos (según ciudad, dia y hora)
      const geojson = await fetchApi(`/distritos/aforos?city=${city}&date=${date}&hour=${hour}`, {}, true);

      // control de error de backend
      if (geojson.error) {
        setError(geojson.message);
        return;
      } else {
        setError(null);
      }

      //elimina capa anterior (si existe) antes de añadir la nueva
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.remove();
      }

      if (alertMarkersRef.current) {
        alertMarkersRef.current.clearLayers();
      }

      //crear capa distritos y pintar cada uno
      geoJsonLayerRef.current = L.geoJSON(geojson, {
        style: (feature) => {    
            const id = feature.properties.ID;
  
          // Producción:    
          // const personas = feature.properties.personas_estimadas || 0;


          // Demo/captura:
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


        // popup con info del distrito
        onEachFeature: (feature, layer) => {
          const id = feature.properties.ID;
          // Producción:
          //  const personas = feature.properties.personas_estimadas || 0;

          

        // Demo/captura:
        const personas = USE_FAKE_AFOROS
          ? mockAforos[id] || 0
          : feature.properties.personas_estimadas || 0;


          layer.bindPopup(`
            <strong>Distrito ${id}</strong><br/>
            Personas aprox.:  ${Math.round(personas)}
          `);

          if (personas > 10000) {
            const center = layer.getBounds().getCenter();

            const alertIcon = L.divIcon({
              className: "",
              html: `<div style="font-size: 14px;">⚠️</div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            L.marker(center, { icon: alertIcon }).addTo(alertMarkersRef.current);
          }
        }
      }).addTo(mapInstanceRef.current);

      // zoom automático para ajustar a los distritos
      const bounds = geoJsonLayerRef.current.getBounds();

      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    };

    loadDistricts();
  }, [city, date, hour, fetchApi]);

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