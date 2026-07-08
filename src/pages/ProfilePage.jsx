import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, getAuthUser, loadJSON, saveJSON } from "@/utils/storage";
import Header from "@/components/Header";
import { User, Mail, Pencil, Save, ArrowLeft, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_PROFILE = {
  name: "",
  email: "",
  username: "",
  avatar: "",
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

  const authUser = getAuthUser();
  const profileKey = `profile:${authUser}`;

  const [profile, setProfile] = useState(() => {
    const saved = loadJSON(profileKey, DEFAULT_PROFILE);
    return {
      ...DEFAULT_PROFILE,
      ...saved,
      name: saved.name || user?.displayName || user?.email?.split("@")[0] || "",      
      email: saved.email || user?.email || "",
      username: saved.username || user?.email || user?.uid || authUser,
      avatar: saved.avatar || user?.photoURL || "",    
    };
  });

  useEffect(() => {
  if (!user) return;

  setProfile((prev) => {
    const fallbackName =
      user.displayName ||
      user.email?.split("@")[0] ||
      "";

    const currentName =
      prev.name === user.email ? "" : prev.name;

    return {
      ...prev,
      name: currentName || fallbackName,
      email: prev.email || user.email || "",
      username: prev.username || user.email || user.uid || "",
      avatar: prev.avatar || user.photoURL || "",
    };
  });
}, [user]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const fileInputRef = useRef(null);

  useEffect(() => {
    saveJSON(profileKey, profile);
  }, [profile, profileKey]);

  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };

  const saveChanges = () => {
    setProfile(draft);
    setEditing(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (editing) {
        setDraft((prev) => ({ ...prev, avatar: dataUrl }));
      } else {
        setProfile((prev) => ({ ...prev, avatar: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const currentData = editing ? draft : profile;
  const initials = (currentData.name || currentData.email || "U")
  .split(" ")
  .map((word) => word[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-card p-8 flex flex-col gap-6">
          <button
            onClick={() => navigate("/mapa")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al mapa
          </button>

          <h1 className="text-xl font-bold text-foreground">Perfil de usuario</h1>

          <div className="flex justify-center">
            <div className="relative group">
              {currentData.avatar ? (
                <img
                  src={currentData.avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-accent/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center text-2xl font-bold text-accent">
                  {initials}
                </div>
              )}
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6 text-foreground" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Field icon={User} label="Nombre" value={currentData.name} editing={editing} onChange={(v) => setDraft((p) => ({ ...p, name: v }))} />
            <Field icon={Mail} label="Correo electrónico" value={currentData.email} editing={editing} placeholder="usuario@ejemplo.com" onChange={(v) => setDraft((p) => ({ ...p, email: v }))} />
          </div>

          {editing ? (
            <div className="flex gap-3">
              <button
                onClick={saveChanges}
                className="flex-1 h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar cambios
              </button>
              <button
                onClick={() => setEditing(false)}
                className="h-11 px-5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="h-11 rounded-md bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Editar perfil
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ icon: Icon, label, value, editing, placeholder, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-accent" />
      {label}
    </label>
    {editing ? (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent transition-all"
      />
    ) : (
      <p className="h-11 flex items-center px-3 rounded-md bg-secondary/50 text-sm text-foreground">
        {value || <span className="text-muted-foreground italic">Sin definir</span>}
      </p>
    )}
  </div>
);

export default ProfilePage;