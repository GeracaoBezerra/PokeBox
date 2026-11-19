import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { listCollection } from "../../api/collection";
import { createOffer } from "../../api/offers";
import { useAcao } from "../../hooks/useAcao";
import { useCarregar } from "../../hooks/useCarregar";
import s from "../../styles/detalheCarta.module.css";
import Aviso from "../Aviso/Aviso";
import CartasOferecidas from "../CartasOferecidas/CartasOferecidas";
import CarregandoCartas from "../CarregandoCartas/CarregandoCartas";

export default function FormOferta({ anuncio }) {
  const { dados: colecao, erro: erroColecao, carregando, recarregar } = useCarregar(listCollection);
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [escolhidas, setEscolhidas] = useState({});
  const acao = useAcao();
  const disponiveis = (colecao ?? []).filter((item) => item.available > 0);
  const total = Object.keys(escolhidas).length;

  function alternar(item, marcado) {
    setEscolhidas((atual) => {
      const novo = { ...atual };
      if (marcado && Object.keys(novo).length < 20) novo[item.id] = 1;
      else if (!marcado) delete novo[item.id];
      return novo;
    });
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (acao.ocupado || acao.sucesso || carregando || total === 0) return;
    const items = Object.entries(escolhidas).map(([collectionItemId, quantity]) => ({ collectionItemId, quantity: Number(quantity) }));
    await acao.executar(() => createOffer(anuncio.id, {
      quantity: Number(quantidade),
      ...(mensagem.trim() ? { message: mensagem.trim() } : {}),
      items,
    }), "Oferta enviada! Acompanhe a resposta em Propostas.");
  }

  return (
    <section className={s.secao} id="fazer-oferta" aria-labelledby="titulo-oferta">
      <header className={s.cabecalho}><span className={s.eyebrow}>Sua próxima troca</span><h2 id="titulo-oferta">Monte sua oferta</h2><p className={s.suave}>Diga o que você quer receber e escolha o que oferece em troca.</p></header>
      <form className={s.painel} onSubmit={enviar}>
        <fieldset className={s.ofertaCampos} disabled={acao.ocupado || Boolean(acao.sucesso)}>
          <div className={s.campos}>
            <label className={s.campo}>Quantas cópias você quer receber<input type="number" min="1" max={anuncio.quantity} required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label>
            <label className={s.campo}>Mensagem para o colecionador (opcional)<input maxLength={500} placeholder="Conte um pouco sobre sua proposta…" value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></label>
          </div>
          <div className={s.cabecalhoSelecao}><h3>O que você oferece</h3><span className={s.suave}>{total}/20 cartas selecionadas</span></div>
          <Aviso erro={erroColecao} />
          {erroColecao && <button type="button" className={s.botaoSecundario} onClick={recarregar}>Carregar coleção novamente</button>}
          {carregando && <CarregandoCartas total={4} formato="tabela" />}
          {!carregando && colecao && disponiveis.length === 0 && <div className={s.vazio}><h3>Sua coleção ainda não tem cartas disponíveis</h3><p>Adicione cartas para montar sua primeira oferta.</p><Link className={s.botaoSecundario} to="/catalogo">Explorar catálogo</Link></div>}
          {!carregando && disponiveis.length > 0 && <CartasOferecidas itens={disponiveis} escolhidas={escolhidas} onAlternar={alternar} onQuantidade={(item, valor) => setEscolhidas((atual) => ({ ...atual, [item.id]: valor }))} />}
          <div className={s.rodapeOferta}><p className={s.suave}>As cartas selecionadas continuam na sua coleção até a conclusão da troca.</p><button className={s.botao} type="submit" disabled={carregando || Boolean(erroColecao) || total === 0}><Send size={16} aria-hidden="true" />{acao.ocupado ? "Enviando…" : "Enviar oferta"}</button></div>
        </fieldset>
        <Aviso erro={acao.erro} />
        {acao.sucesso && <Link className={s.link} to="/propostas">Acompanhar minha oferta</Link>}
      </form>
    </section>
  );
}
