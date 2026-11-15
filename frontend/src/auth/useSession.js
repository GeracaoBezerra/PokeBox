import { useSyncExternalStore } from "react";
import { useAuthService } from "./useAuthService";

export function useSession() {
  const service = useAuthService();
  return useSyncExternalStore(service.subscribe, service.getSession);
}
