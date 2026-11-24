import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthService } from "../../auth/useAuthService";
import { useSession } from "../../auth/useSession";

export default function RotaPrivada() {
  const service = useAuthService();
  const session = useSession();
  const location = useLocation();
  const [abriuComSessao] = useState(() => Boolean(session));

  if (!session) {
    if (abriuComSessao && service.saiuPorVontade()) return <Navigate to="/" replace />;
    return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
