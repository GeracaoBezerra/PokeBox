import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../../auth/useSession";

export default function RotaPublicaSo() {
  const session = useSession();
  const location = useLocation();

  if (session) return <Navigate to={location.state?.de ?? "/"} replace />;

  return <Outlet />;
}
