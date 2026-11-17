import { useCallback, useEffect, useRef, useState } from "react";

export function useCarregar(carregar, chave = "") {
  const carregarRef = useRef(carregar);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState({ dados: null, erro: null, chave: null, versao: -1 });
  const carregando = estado.chave !== chave || estado.versao !== versao;

  useEffect(() => {
    carregarRef.current = carregar;
  });

  useEffect(() => {
    let ativo = true;
    carregarRef
      .current()
      .then((dados) => ativo && setEstado({ dados, erro: null, chave, versao }))
      .catch((erro) => ativo && setEstado({ dados: null, erro, chave, versao }));
    return () => {
      ativo = false;
    };
  }, [chave, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return { dados: estado.dados, erro: carregando ? null : estado.erro, carregando, recarregar };
}
