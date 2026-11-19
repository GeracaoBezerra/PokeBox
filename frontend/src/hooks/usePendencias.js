import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { listMyOffers } from "../api/offers";
import { listMyTrades } from "../api/trades";
import { useSession } from "../auth/useSession";
import { useCarregar } from "./useCarregar";

const EVENTO_PENDENCIAS = "pendencias:mudou";
const SEM_PENDENCIAS = { ofertas: 0, trocas: 0 };
const INTERVALO_MINIMO_MS = 60 * 1000;

export function avisarQuePendenciasMudaram() {
  window.dispatchEvent(new Event(EVENTO_PENDENCIAS));
}

async function contar() {
  const [ofertas, trocas] = await Promise.all([listMyOffers("PROPOSED"), listMyTrades("PROPOSED")]);
  return { ofertas: ofertas.received.length, trocas: trocas.received.length };
}

export function usePendencias() {
  const session = useSession();
  const { pathname } = useLocation();
  const ultimaContagem = useRef(0);
  const { dados, recarregar } = useCarregar(() => {
    ultimaContagem.current = Date.now();
    return session ? contar() : Promise.resolve(null);
  }, session ? session.user?.username ?? "logado" : "");

  useEffect(() => {
    if (Date.now() - ultimaContagem.current >= INTERVALO_MINIMO_MS) recarregar();
  }, [pathname, recarregar]);

  useEffect(() => {
    window.addEventListener(EVENTO_PENDENCIAS, recarregar);
    return () => window.removeEventListener(EVENTO_PENDENCIAS, recarregar);
  }, [recarregar]);

  return session && dados ? dados : SEM_PENDENCIAS;
}
