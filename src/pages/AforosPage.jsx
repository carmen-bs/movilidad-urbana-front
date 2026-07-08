import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getAuthUser, loadJSON, saveJSON } from "@/utils/storage";
import Header from "@/components/Header";
import AforosPanel from "@/components/AforosPanel";

const AforosPage = () => {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const key = `zonas:${authUser}`;

  // usuario no está autenticado --> redirige a login
  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

  // Estado que contiene las zonas guardadas
  const [zones, setZones] = useState(() => loadJSON(key, []));

  // guarda zonas cuando cambian
  useEffect(() => saveJSON(key, zones), [zones, key]);

  // Guarda una zona seleccionada y navega al mapa
  const viewOnMap = (zone) => {
    saveJSON(`selectedZone:${authUser}`, zone);
    navigate("/mapa");
  };
return (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />

    <div className="flex-1 px-6 py-5 w-full max-w-[1500px] mx-auto">

      <AforosPanel />
    </div>

  </div>
);
};

export default AforosPage;