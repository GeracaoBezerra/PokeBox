import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { avisoDeAdicao } from "../../utils/colecao";
import AdicionarNaColecao from "../AdicionarNaColecao/AdicionarNaColecao";
import BuscaCartas from "../BuscaCartas/BuscaCartas";
import ModalColecao from "../ModalColecao/ModalColecao";
import s from "./AdicionarCartaColecao.module.css";

function botaoEscolher(carta) {
  return { texto: "Escolher", rotulo: `Escolher ${carta.name}`, desativado: false };
}

function Passos({ onAdicionou }) {
  const [escolha, setEscolha] = useState(null);
  const busca = useRef(null);

  useEffect(() => {
    if (!escolha) busca.current?.focus();
  }, [escolha]);

  if (!escolha) {
    return <BuscaCartas botao={botaoEscolher} inputRef={busca} onEscolher={(carta, lang) => setEscolha({ carta, lang })} />;
  }

  const expansao = [escolha.carta.set?.name, escolha.carta.number].filter(Boolean).join(" · ");
  return (
    <div className={s.passo}>
      <div className={s.escolhida}>
        <p>
          <strong>{escolha.carta.name}</strong>
          {expansao && <span>{expansao}</span>}
        </p>
        <button type="button" className={s.trocar} onClick={() => setEscolha(null)}>
          <ArrowLeft size={16} aria-hidden="true" /> Trocar carta
        </button>
      </div>
      <AdicionarNaColecao carta={escolha.carta} lang={escolha.lang} mensagem={avisoDeAdicao} onAdicionado={onAdicionou} />
    </div>
  );
}

export default function AdicionarCartaColecao({ aberto, onFechar, onAdicionou }) {
  return (
    <ModalColecao aberto={aberto} larga titulo="Adicionar carta" icone={<Plus size={20} aria-hidden="true" />} onFechar={onFechar}>
      <Passos onAdicionou={onAdicionou} />
    </ModalColecao>
  );
}
