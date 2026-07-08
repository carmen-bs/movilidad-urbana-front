import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useApi } from "@/hooks/useApi";
import fondoCiudad from "@/assets/fondo1-mobility.png";
import logo from "@/assets/logo-mobility.png";
import tituloMovilidad from "@/assets/titulo-mobility.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { fetchApi } = useApi();

  const handleFirebaseLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken(true);

      localStorage.setItem("firebaseToken", token);
      localStorage.setItem("user", result.user.email || result.user.uid);

      const data = await fetchApi("/me/access", {}, true);

      if (data.serviceType?.includes("itinerarios")) {
        navigate("/mapa");
      } else if (data.serviceType?.includes("aforos")) {
        navigate("/zonas");
      } else {
        navigate("/no-access");
      }
    } catch (err) {
      setError("Error en login: " + err.message);
    } finally {
      setLoading(false);
    }
  };

 return (
  <div
    className="min-h-screen flex items-center justify-center relative overflow-hidden bg-center bg-cover bg-no-repeat"
    style={{ backgroundImage: `url(${fondoCiudad})` }}
  >
    {/* overlay */}
    <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

    {/* card principal */}
    <div className="relative z-10 w-full max-w-[460px] mx-4 bg-white/85 backdrop-blur-xl rounded-3xl border border-white/40 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col gap-5">

      {/* badge */}
      <span className="self-start text-xs font-semibold tracking-wide uppercase bg-verde-claro text-white px-3 py-1 rounded-full text-sm shadow-sm">
        Acceso
      </span>

      {/* header */}
      <div className="flex items-center gap-4">
        <img
          src={logo}
          alt="Logo Movilidad"
          className="w-20 h-16 object-contain shrink-0"
        />

        <img
          src={tituloMovilidad}
          alt="Movilidad"
          className="h-[120px] w-auto object-contain"
        />
      </div>

      {/* caja interior */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/50 p-5 shadow-inner flex flex-col gap-4">

        {/* texto */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Accede fácilmente a la plataforma
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Regístrate con tu cuenta corporativa de Google.
          </p>
        </div>

        {/* botón */}
        <button
          onClick={handleFirebaseLogin}
          disabled={loading}
          className="h-[52px] w-full rounded-xl bg-white text-gray-700 font-medium flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          {loading ? "Cargando..." : "Registrarse con Google"}
        </button>

        {/* texto legal */}
        <p className="text-xs text-gray-500 text-center">
          Es necesario disponer de una cuenta corporativa{" "}
          <span className="font-semibold text-gray-700">autorizada</span>.
        </p>

      </div>
    </div>
  </div>
);
}
export default LoginPage;