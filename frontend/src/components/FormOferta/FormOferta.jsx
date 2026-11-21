import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { listCollection } from "../../api/collection";
import { errosPorCampo } from "../../api/mensagens";
import { createOffer } from "../../api/offers";
import { useAcao } from "../../hooks/useAcao";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import s from "../../styles/detalheCarta.module.css";
import { temPalavra } from "../../utils/filtrosMarketplace";
import { LIMITE_CARTAS_OFERTA, cartasDaBusca, quantidadesInvalidas, textoCartasSelecionadas, textoQuantidadesInvalidas } from "../../utils/oferta";
import Aviso from "../Aviso/Aviso";
import CampoBusca from "../CampoBusca/CampoBusca";
import ErroCampo from "../ErroCampo/ErroCampo";
import CartasOferecidas from "../CartasOferecidas/CartasOferecidas";
import CarregandoCartas from "../CarregandoCartas/CarregandoCartas";
import ResumoTroca from "../ResumoTroca/ResumoTroca";

const disponivel = (item) => item.available > 0;

export default function FormOferta({ anuncio }) {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const q = temPalavra(termo) ? termo : "";
  const colecao = useListaPaginada((page) => listCollection({ page }));
  const pesquisa = useListaPaginada((page) => (q ? listCollection({ q, page }) : Promise.resolve(null)), q);
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [escolhidas, setEscolhidas] = useState({});
  const [conferirQuantidades, setConferirQuantidades] = useState(false);
  const acao = useAcao();
  const navigate = useNavigate();
  const id = useId();
  const erros = errosPorCampo(acao.erro?.details);
  const buscando = busca.trim() !== "";
  const daColecao = colecao.itens.filter(disponivel);
  const visiveis = cartasDaBusca(daColecao, q ? pesquisa.itens.filter(disponivel) : [], busca);
  const lista = buscando && q ? pesquisa : colecao;
  const esperandoBusca = buscando && temPalavra(busca.trim()) && (busca.trim() !== termo || pesquisa.carregando);
  const listaEscolhidas = Object.values(escolhidas);
  const quantidades = Object.fromEntries(listaEscolhidas.map(({ item, quantidade: qtd }) => [item.id, qtd]));
  const total = listaEscolhidas.length;
  const invalidas = quantidadesInvalidas(listaEscolhidas);
  const avisoQuantidades = conferirQuantidades ? textoQuantidadesInvalidas(invalidas) : "";
  const carregando = colecao.carregando;
  const erroColecao = colecao.erro ?? pesquisa.erro;

  useEffect(() => {
    const espera = setTimeout(() => setTermo(busca.trim()), 300);
    return () => clearTimeout(espera);
  }, [busca]);

  function alternar(item, marcado) {
    setEscolhidas((atual) => {
      const novo = { ...atual };
      if (marcado && Object.keys(novo).length < LIMITE_CARTAS_OFERTA) novo[item.id] = { item, quantidade: 1 };
      else if (!marcado) delete novo[item.id];
      return novo;
    });
  }

  function mudarQuantidade(item, valor) {
    setEscolhidas((atual) => (atual[item.id] ? { ...atual, [item.id]: { ...atual[item.id], quantidade: valor } } : atual));
  }

  function recarregar() {
    colecao.recarregar();
    pesquisa.recarregar();
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (acao.ocupado || carregando || total === 0) return;
    if (invalidas.length > 0) {
      setConferirQuantidades(true);
      return;
    }
    const items = listaEscolhidas.map(({ item, quantidade: qtd }) => ({ collectionItemId: item.id, quantity: Number(qtd) }));
    const { ok } = await acao.executar(() => createOffer(anuncio.id, {
      quantity: Number(quantidade),
      ...(mensagem.trim() ? { message: mensagem.trim() } : {}),
      items,
    }));
    if (ok) {
      navigate("/propostas?aba=enviadas", {
        state: { aviso: `Oferta enviada para @${anuncio.owner.username}.` },
      });
    }
  }

  return (
    <section className={s.secao} id="fazer-oferta" aria-labelledby="titulo-oferta">
      <header className={s.cabecalho}><span className={s.eyebrow}>Sua próxima troca</span><h2 id="titulo-oferta">Monte sua oferta</h2><p className={s.suave}>Diga o que você quer receber e escolha o que oferece em troca.</p></header>
      <form className={s.painel} onSubmit={enviar}>
        <fieldset className={s.ofertaCampos} disabled={acao.ocupado}>
          <div className={s.campos}>
            <div>
              <label className={s.campo}>Quantas cópias você quer receber<input type="number" min="1" max={anuncio.quantity} required value={quantidade} aria-invalid={Boolean(erros.quantity)} aria-describedby={erros.quantity ? `${id}-quantidade` : undefined} onChange={(e) => setQuantidade(e.target.value)} /></label>
              <ErroCampo id={`${id}-quantidade`} mensagem={erros.quantity} />
            </div>
            <div>
              <label className={s.campo}>Mensagem para o colecionador (opcional)<input maxLength={500} placeholder="Conte um pouco sobre sua proposta…" value={mensagem} aria-invalid={Boolean(erros.message)} aria-describedby={erros.message ? `${id}-mensagem` : undefined} onChange={(e) => setMensagem(e.target.value)} /></label>
              <ErroCampo id={`${id}-mensagem`} mensagem={erros.message} />
            </div>
          </div>
          <div className={s.cabecalhoSelecao}><h3>O que você oferece</h3><span className={s.suave}>{total}/{LIMITE_CARTAS_OFERTA} cartas selecionadas</span></div>
          <p className={s.suave}>As cartas selecionadas continuam na sua coleção até a conclusão da troca.</p>
          <Aviso erro={erroColecao} />
          {erroColecao && <button type="button" className={s.botaoSecundario} onClick={recarregar}>Carregar coleção novamente</button>}
          {carregando && <CarregandoCartas total={4} formato="tabela" />}
          {!carregando && !colecao.erro && !colecao.temMais && daColecao.length === 0 && <div className={s.vazio}><h3>Sua coleção ainda não tem cartas disponíveis</h3><p>Adicione cartas para montar sua primeira oferta.</p><Link className={s.botaoSecundario} to="/catalogo">Explorar catálogo</Link></div>}
          {!carregando && (daColecao.length > 0 || colecao.temMais) && <CampoBusca rotulo="Buscar na sua coleção" placeholder="Nome da carta" valor={busca} onMudar={setBusca} imediato />}
          {!carregando && buscando && !esperandoBusca && visiveis.length === 0 && <div className={s.semResultado}><p className={s.suave}>Nenhuma carta da sua coleção com esse nome.</p><button type="button" className={s.botaoSecundario} onClick={() => setBusca("")}>Limpar busca</button></div>}
          {!carregando && visiveis.length > 0 && <CartasOferecidas itens={visiveis} escolhidas={quantidades} onAlternar={alternar} onQuantidade={mudarQuantidade} />}
          {esperandoBusca && <p className={s.suave} role="status">Buscando na sua coleção…</p>}
          {!carregando && !esperandoBusca && lista.temMais && <button type="button" className={s.botaoSecundario} disabled={lista.carregandoMais} onClick={lista.carregarMais}>{lista.carregandoMais ? "Carregando…" : "Carregar mais cartas"}</button>}
          <ResumoTroca anuncio={anuncio} quantidade={quantidade} escolhidas={listaEscolhidas} aviso={avisoQuantidades} />
          <div className={s.rodapeOferta}><span className={s.resumoOferta}>{textoCartasSelecionadas(total)}</span><button className={s.botao} type="submit" disabled={carregando || total === 0}><Send size={16} aria-hidden="true" />{acao.ocupado ? "Enviando…" : "Enviar oferta"}</button></div>
        </fieldset>
        <Aviso erro={acao.erro} campos={["quantity", "message"]} />
      </form>
    </section>
  );
}
