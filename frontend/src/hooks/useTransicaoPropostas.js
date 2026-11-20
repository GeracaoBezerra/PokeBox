import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useTransicaoPropostas(dados, grade, painel) {
  const [exibidos, setExibidos] = useState(dados);
  const posicoes = useRef(null);

  useEffect(() => {
    if (dados === exibidos) return undefined;
    const lista = grade.current;
    const linhas = Array.from(lista.children);
    const novosIds = new Set(dados.map((item) => String(item.id)));
    const removidas = linhas.filter((linha) => !novosIds.has(linha.dataset.id));
    const mudouOrdem = linhas.some((linha, i) => linha.dataset.id !== String(dados[i]?.id));
    const animar = mudouOrdem && typeof lista.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saidas = animar ? removidas.map((linha) => linha.animate(
      [{ opacity: 1 }, { opacity: 0, transform: "translateY(-6px)" }],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    )) : [];
    let ativo = true;

    Promise.allSettled(saidas.map((saida) => saida.finished)).then(() => {
      if (!ativo) return;
      if (animar) {
        posicoes.current = new Map(linhas.map((linha) => [linha, linha.getBoundingClientRect().top]));
        for (const linha of linhas) {
          if (novosIds.has(linha.dataset.id)) linha.getAnimations().forEach((animacao) => animacao.cancel());
        }
      }
      if (removidas.some((linha) => linha.contains(document.activeElement))) painel.current?.focus({ preventScroll: true });
      setExibidos(dados);
    });

    return () => {
      ativo = false;
      saidas.forEach((saida) => saida.cancel());
    };
  }, [dados, exibidos, grade, painel]);

  useLayoutEffect(() => {
    const anteriores = posicoes.current;
    posicoes.current = null;
    if (!anteriores) return;

    for (const linha of grade.current.children) {
      if (!anteriores.has(linha)) continue;
      const delta = anteriores.get(linha) - linha.getBoundingClientRect().top;
      if (delta) linha.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: "none" }],
        { duration: 260, easing: "ease-out" },
      );
    }
  }, [exibidos, grade]);

  return exibidos;
}
