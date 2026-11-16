import { useState } from "react";
import { listCollection } from "../../api/collection";
import { createOffer } from "../../api/offers";
import { useAcao } from "../../hooks/useAcao";
import { useCarregar } from "../../hooks/useCarregar";
import s from "../../styles/paginas.module.css";
import Aviso from "../Aviso/Aviso";
import CartasOferecidas from "../CartasOferecidas/CartasOferecidas";

export default function FormOferta({ anuncio }) {
  const { dados: colecao, erro: erroColecao } = useCarregar(listCollection);
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [escolhidas, setEscolhidas] = useState({});
  const acao = useAcao();

  const disponiveis = (colecao ?? []).filter((item) => item.available > 0);

  function alternar(item, marcado) {
    setEscolhidas((atual) => {
      const novo = { ...atual };
      if (marcado) novo[item.id] = 1;
      else delete novo[item.id];
      return novo;
    });
  }

  function mudarQuantidade(item, valor) {
    setEscolhidas((atual) => ({ ...atual, [item.id]: valor }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    const items = Object.entries(escolhidas).map(([collectionItemId, quantity]) => ({
      collectionItemId,
      quantity: Number(quantity),
    }));
    await acao.executar(
      () =>
        createOffer(anuncio.id, {
          quantity: Number(quantidade),
          ...(mensagem.trim() ? { message: mensagem.trim() } : {}),
          items,
        }),
      "Oferta enviada. Acompanhe em Propostas."
    );
  }

  return (
    <form className={`${s.secao} ${s.painel}`} onSubmit={enviar}>
      <h2>Fazer uma oferta</h2>
      <div className={s.form}>
        <label className={s.campo}>
          Quantas cartas do anúncio você quer
          <input
            type="number"
            min="1"
            max={anuncio.quantity}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </label>
        <label className={s.campo}>
          Mensagem (opcional)
          <input value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </label>
      </div>

      <h3 className={s.secao}>O que você oferece em troca (da sua coleção)</h3>
      <Aviso erro={erroColecao} />
      {colecao && disponiveis.length === 0 && (
        <p className={s.suave}>Você não tem cartas disponíveis para oferecer.</p>
      )}
      {disponiveis.length > 0 && (
        <CartasOferecidas
          itens={disponiveis}
          escolhidas={escolhidas}
          onAlternar={alternar}
          onQuantidade={mudarQuantidade}
        />
      )}

      <div className={s.acoes}>
        <button
          className={s.botao}
          type="submit"
          disabled={acao.ocupado || Object.keys(escolhidas).length === 0}
        >
          Enviar oferta
        </button>
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </form>
  );
}
