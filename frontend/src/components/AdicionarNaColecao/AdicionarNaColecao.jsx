import { getCard } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import { buscarComReserva } from "../../utils/idioma";
import Aviso from "../Aviso/Aviso";
import FormColecao from "../FormColecao/FormColecao";

export default function AdicionarNaColecao({ carta, lang, onAdicionado, mensagem }) {
  const detalhe = useCarregar(
    () => buscarComReserva((idioma) => getCard(carta.id, idioma), lang),
    `${carta.id}|${lang ?? ""}`
  );
  if (detalhe.carregando) return <p role="status">Carregando…</p>;
  if (detalhe.erro) return <Aviso erro={detalhe.erro} onTentarDeNovo={detalhe.recarregar} />;
  const { dados, lang: idioma } = detalhe.dados;
  return <FormColecao key={carta.id} card={dados.card} lang={idioma} onAdicionado={onAdicionado} mensagem={mensagem} />;
}
