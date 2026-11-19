import { useCallback, useEffect, useRef, useState } from "react";

export function useListaPaginada(buscar, chave = "") {
  const buscarRef = useRef(buscar);
  const [alvo, setAlvo] = useState({ chave, pagina: 1, versao: 0 });
  const [estado, setEstado] = useState({ chave: null, pagina: 0, versao: -1, itens: [], temMais: false, erro: null });

  if (alvo.chave !== chave) setAlvo({ chave, pagina: 1, versao: alvo.versao });

  useEffect(() => {
    buscarRef.current = buscar;
  });

  useEffect(() => {
    let ativo = true;
    const marca = { chave: alvo.chave, pagina: alvo.pagina, versao: alvo.versao };
    buscarRef
      .current(alvo.pagina)
      .then((resposta) => {
        if (!ativo) return;
        setEstado((atual) => ({
          ...marca,
          itens: alvo.pagina === 1 ? resposta?.items ?? [] : [...atual.itens, ...(resposta?.items ?? [])],
          temMais: Boolean(resposta?.pagination?.hasNextPage),
          erro: null,
        }));
      })
      .catch((erro) => {
        if (!ativo) return;
        setEstado((atual) => ({ ...marca, itens: alvo.pagina === 1 ? [] : atual.itens, temMais: atual.temMais, erro }));
      });
    return () => {
      ativo = false;
    };
  }, [alvo]);

  const pronto = estado.chave === alvo.chave && estado.pagina === alvo.pagina && estado.versao === alvo.versao;
  const proximaPagina = estado.pagina + 1;
  const carregarMais = useCallback(() => setAlvo((atual) => ({ ...atual, pagina: proximaPagina })), [proximaPagina]);
  const recarregar = useCallback(() => setAlvo((atual) => ({ chave: atual.chave, pagina: 1, versao: atual.versao + 1 })), []);

  return {
    itens: estado.chave === chave ? estado.itens : [],
    temMais: pronto && estado.temMais,
    carregando: !pronto && alvo.pagina === 1,
    carregandoMais: !pronto && alvo.pagina > 1,
    erro: pronto ? estado.erro : null,
    carregarMais,
    recarregar,
  };
}
