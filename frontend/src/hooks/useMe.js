import { useEffect, useState } from "react";
import { getMe } from "../api/auth";
import { useSession } from "../auth/useSession";

export function useMe() {
  const session = useSession();
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!session) return;
    let ativo = true;
    getMe()
      .then((user) => ativo && setMe(user))
      .catch(() => ativo && setMe(null));
    return () => {
      ativo = false;
    };
  }, [session]);

  return session ? me : null;
}
