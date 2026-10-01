import {useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/utils/storage";
import Header from "@/components/Header";
import AforosPanel from "@/components/AforosPanel";

const AforosPage = () => {
  const navigate = useNavigate();

  // usuario no está autenticado --> redirige a login
  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

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