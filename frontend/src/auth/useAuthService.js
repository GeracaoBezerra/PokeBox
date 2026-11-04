import { useContext } from "react";
import { AuthContext } from "./authContext";

export function useAuthService() {
  const service = useContext(AuthContext);
  if (!service) {
    throw new Error("useAuthService deve ser usado dentro de AuthProvider");
  }
  return service;
}