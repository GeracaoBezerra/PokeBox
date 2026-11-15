import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../../auth/useSession";

export default function RotaPrivada() {
  const session = useSession();
  const location = useLocation();

  if (!session) return <Navigate to="/login" replace state={{ de: location.pathname }} />;

  return <Outlet />;
}
