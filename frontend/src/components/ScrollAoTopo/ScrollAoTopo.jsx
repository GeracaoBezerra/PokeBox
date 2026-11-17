import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollAoTopo() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    const anterior = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = anterior;
    };
  }, []);

  useLayoutEffect(() => {
    // Âncoras continuam levando às seções da página.
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, hash]);

  return null;
}
