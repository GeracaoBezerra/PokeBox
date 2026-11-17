import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollAoTopo() {
  const { pathname, search, hash } = useLocation();
  const tipo = useNavigationType();

  useLayoutEffect(() => {
    if (hash || tipo === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, hash, tipo]);

  return null;
}
