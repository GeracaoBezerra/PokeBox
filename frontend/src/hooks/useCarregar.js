import { useCallback, useEffect, useRef, useState } from "react";

export function useCarregar(carregar, chave = "") {
  const carregarRef = useRef(carregar);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: true });

  useEffect(() => {
    carregarRef.current = carregar;
  });

  useEffect(() => {
    let ativo = true;
    carregarRef
      .current()
      .then((dados) => ativo && setEstado({ dados, erro: null, carregando: false }))
      .catch((erro) => ativo && setEstado({ dados: null, erro, carregando: false }));
    return () => {
      ativo = false;
    };
  }, [chave, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return { ...estado, recarregar };
}
