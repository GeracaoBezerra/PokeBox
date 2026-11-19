import { useSearchParams } from "react-router-dom";
import { lerFiltrosNegociacao, mudarFiltros } from "../utils/negociacao";

export function useFiltrosNegociacao(statusValidos) {
  const [params, setParams] = useSearchParams();
  const filtros = lerFiltrosNegociacao(params, statusValidos);

  function atualizar(mudancas, reiniciarPagina = true) {
    setParams((atuais) => mudarFiltros(atuais, mudancas, reiniciarPagina), { replace: reiniciarPagina });
  }

  return { ...filtros, atualizar };
}
