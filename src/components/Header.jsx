import { useNavigate, useLocation } from "react-router-dom";
import { getAuthUser, logout } from "@/utils/storage";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import logo from "@/assets/logo-mobility.png";
import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getAuthUser();
  const { fetchApi } = useApi();

  const [serviceType, setServiceType] = useState([]);

  useEffect(() => {
    async function loadAccess() {
      try {
        const data = await fetchApi("/me/access", {}, true);
        setServiceType(data.serviceType || []);
      } catch (error) {
        console.error("Error cargando serviceType:", error);
        setServiceType([]);
      }
    }

    loadAccess();
  }, [fetchApi]);

  const NAV_ITEMS = [
    serviceType.includes("itinerarios") && {
      label: "Gestión de itinerarios",
      path: "/mapa",
    },
    serviceType.includes("aforos") && {
      label: "Gestión de aforos",
      path: "/zonas",
    },
  ].filter(Boolean);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error cerrando sesión en Firebase:", error);
    }

    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shrink-0">
      <div
        onClick={() => navigate("/mapa")}
        className="flex items-center gap-2 cursor-pointer"
      >
        <img src={logo} alt="Movilidad" className="h-8 w-auto object-contain" />
        <span className="text-lg font-bold text-foreground tracking-tight">
          Movilidad Urbana
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                active
                  ? "bg-verde text-white"
                  : "text-verde hover:text-foreground hover:bg-verde-claro"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/perfil")}
          className="text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          Hola, <span className="font-medium text-foreground">{user}</span>
        </button>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:opacity-80 transition-opacity duration-150"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>
    </header>
  );
};

export default Header;