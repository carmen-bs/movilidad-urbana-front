import bg from "@/assets/fondo1-mobility.png"; // mismo fondo que login
import icon from "@/assets/noAccess_icon.png";

const AccessDenied = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="bg-white backdrop-blur-md border border-border rounded-2xl p-8 shadow-[var(--shadow-card)] text-center max-w-md w-full">

        {/* Icono */}
        <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <img src={icon} className="w-8 h-8" />
            </div>
        </div>

        {/* Título */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Acceso restringido
        </h2>

        {/* Texto */}
        <p className="text-sm text-muted-foreground mb-4">
          Actualmente tu usuario no dispone de permisos para acceder a esta aplicación.
        </p>

        <p className="text-sm text-muted-foreground mb-6">
          Si necesitas acceso, contacta con el equipo responsable.
        </p>
       
      </div>
    </div>
  );
};

export default AccessDenied;