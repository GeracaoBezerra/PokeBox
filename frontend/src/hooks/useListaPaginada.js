import { useCallback, useEffect, useRef, useState } from "react";

const VAZIA = { alvo: null, ultima: 0, itens: [], temMais: false, erro: null };

export function useListaPaginada(buscar, chave = "") {
  const buscarRef = useRef(buscar);
  const [alvo, setAlvo] = useState({ chave, de: 1, ate: 1 });
  const [estado, setEstado] = useState(VAZIA);

  if (alvo.chave !== chave) setAlvo({ chave, de: 1, ate: 1 });

  useEffect(() => {
    buscarRef.current = buscar;
  });

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;
    const buscarPagina = buscarRef.current;
    async function carregar() {
      const itens = [];
      let pagina = alvo.de;
      try {
        for (;; pagina++) {
          const resposta = await buscarPagina(pagina, signal);
          if (signal.aborted) return;
          itens.push(...(resposta?.items ?? []));
          const temMais = Boolean(resposta?.pagination?.hasNextPage);
          if (!temMais || pagina === alvo.ate) {
            setEstado((anterior) => ({
              alvo, ultima: pagina, temMais, erro: null,
              itens: alvo.de === 1 ? itens : [...anterior.itens, ...itens],
            }));
            return;
          }
        }
      } catch (erro) {
        if (!signal.aborted) setEstado((anterior) => ({
          ...(anterior.alvo?.chave === alvo.chave ? anterior : VAZIA), alvo, erro,
        }));
      }
    }
    carregar();
    return () => controlador.abort();
  }, [alvo]);

  const atual = estado.alvo?.chave === chave ? estado : VAZIA;
  const pronto = estado.alvo === alvo;
  const proxima = atual.ultima + 1;
  const carregarMais = useCallback(() => {
    setAlvo((anterior) => ({ chave: anterior.chave, de: proxima, ate: proxima }));
  }, [proxima]);
  const recarregar = useCallback(() => setAlvo((anterior) => ({ chave: anterior.chave, de: 1, ate: 1 })), []);
  const atualizarCarregadas = useCallback(() => setAlvo((anterior) => ({ ...anterior, de: 1 })), []);
  const tentarDeNovo = useCallback(() => setAlvo((anterior) => ({ ...anterior })), []);

  return {
    itens: atual.itens,
    temMais: pronto && atual.temMais,
    carregando: !pronto && alvo.de === 1,
    carregandoMais: !pronto && alvo.de > 1,
    erro: pronto ? atual.erro : null,
    carregarMais,
    recarregar,
    atualizarCarregadas,
    tentarDeNovo,
  };
}
