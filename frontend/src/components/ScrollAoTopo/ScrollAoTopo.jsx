import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const posicoes = new Map();
const PRAZO_RESTAURAR = 8000;
const INTERRUPCOES = ["wheel", "touchstart", "keydown", "mousedown"];

export default function ScrollAoTopo() {
  const { key, pathname, search, hash } = useLocation();
  const tipo = useNavigationType();
  const chaveRef = useRef(key);
  const restaurandoRef = useRef(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    let quadro = 0;
    function guardar() {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        if (!restaurandoRef.current) posicoes.set(chaveRef.current, window.scrollY);
      });
    }
    window.addEventListener("scroll", guardar, { passive: true });
    return () => {
      window.removeEventListener("scroll", guardar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  useLayoutEffect(() => {
    chaveRef.current = key;
    const guardada = tipo === "POP" ? posicoes.get(key) : undefined;
    const secao = hash && guardada === undefined ? document.getElementById(hash.slice(1)) : null;
    const alvo = guardada ?? 0;
    const posicionar = secao
      ? () => secao.scrollIntoView({ block: "start", behavior: "instant" })
      : () => window.scrollTo({ top: alvo, left: 0, behavior: "instant" });
    posicionar();
    if (!secao && alvo === 0) return undefined;

    const raiz = document.documentElement;
    restaurandoRef.current = true;
    raiz.style.overflowAnchor = "none";
    const observador = new ResizeObserver(posicionar);
    const prazo = setTimeout(parar, PRAZO_RESTAURAR);
    function parar() {
      restaurandoRef.current = false;
      raiz.style.overflowAnchor = "";
      observador.disconnect();
      clearTimeout(prazo);
      INTERRUPCOES.forEach((evento) => window.removeEventListener(evento, parar));
    }
    observador.observe(document.body);
    INTERRUPCOES.forEach((evento) => window.addEventListener(evento, parar, { passive: true }));
    return parar;
  }, [key, pathname, search, hash, tipo]);

  return null;
}
