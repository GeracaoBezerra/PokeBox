import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Send } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { listMyOffers } from "../api/offers";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoOferta from "../components/CartaoOferta/CartaoOferta";
import { idDaAba } from "../components/Abas/idDaAba";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { useFiltrosNegociacao } from "../hooks/useFiltrosNegociacao";
import { useTransicaoPropostas } from "../hooks/useTransicaoPropostas";
import { STATUS_NEGOCIACAO } from "../utils/rotulos";
import s from "./myOffers.module.css";

const PAINEL = "painel-propostas";
const VAZIO = {
  recebidas: { titulo: "Nenhuma proposta recebida", texto: "As ofertas nos seus anúncios aparecem aqui.", para: "/anuncios", link: "Ver meus anúncios", Icone: Inbox },
  enviadas: { titulo: "Nenhuma proposta enviada", texto: "Encontre uma carta no marketplace para fazer uma oferta.", para: "/marketplace", link: "Explorar o marketplace", Icone: Send },
};

function SemPropostas({ aba, status, page, limpar }) {
  const { titulo, texto, para, link, Icone } = VAZIO[aba];
  if (page > 1) return <div className={s.vazio}><h2>Nenhuma proposta nesta página</h2></div>;

  return (
    <div className={s.vazio}>
      <Icone size={24} aria-hidden="true" />
      <h2>{status ? "Nenhuma proposta com este status" : titulo}</h2>
      {status ? <button className={s.atalho} type="button" onClick={limpar}>Ver todos os status</button> : (
        <>
          <p>{texto}</p>
          <Link className={s.atalho} to={para}>{link}</Link>
        </>
      )}
    </div>
  );
}

function ListaPropostas({ filtros, painel }) {
  const { aba, side, status, page, atualizar } = filtros;
  const grade = useRef(null);
  const rodape = useRef(null);
  const proximoFoco = useRef(null);
  const lista = useListaPaginada((lote) => listMyOffers({ side, status, page: page + lote - 1 }));
  const ofertas = useMemo(() => [...new Map(lista.itens.map((o) => [o.id, o])).values()], [lista.itens]);
  const exibidos = useTransicaoPropostas(ofertas, grade, painel);
  const atualizando = lista.carregando || exibidos !== ofertas;
  const buscarAoRolar = lista.temMais && !lista.erro && !atualizando;
  const { carregarMais } = lista;

  useEffect(() => {
    if (!buscarAoRolar || typeof IntersectionObserver !== "function") return;
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        observador.disconnect();
        carregarMais();
      }
    }, { rootMargin: "0px 0px 320px" });
    observador.observe(rodape.current);
    return () => observador.disconnect();
  }, [buscarAoRolar, carregarMais]);

  useEffect(() => {
    const indice = proximoFoco.current;
    if (indice == null || exibidos.length <= indice) return;
    proximoFoco.current = null;
    if (document.activeElement === document.body || rodape.current?.contains(document.activeElement)) {
      grade.current.children[indice]?.querySelector("h2 a")?.focus();
    }
  }, [exibidos]);

  return (
    <>
      {page > 1 && <button className={s.atalho} type="button" onClick={() => atualizar({ page: 1 }, false)}>Ver desde o início</button>}
      {lista.carregando && !exibidos.length && (
        <div className={s.carregando} role="status" aria-label="Carregando propostas">
          <div aria-hidden="true"><span /><span /></div>
          <div aria-hidden="true"><span /><span /></div>
        </div>
      )}
      <ul className={s.lista} role="list" ref={grade} aria-label="Lista de propostas" aria-busy={atualizando || lista.carregandoMais}>
        {exibidos.map((oferta) => (
          <li key={oferta.id} data-id={oferta.id}>
            <CartaoOferta
              oferta={oferta}
              recebida={aba === "recebidas"}
              atualizando={atualizando}
              onMudou={lista.atualizarCarregadas}
            />
          </li>
        ))}
      </ul>
      {!atualizando && !lista.erro && exibidos.length === 0 && (
        <SemPropostas aba={aba} status={status} page={page} limpar={() => atualizar({ status: "" })} />
      )}
      <div ref={rodape} className={s.fimLista}>
        <Aviso erro={lista.erro} />
        {exibidos.length > 0 && <p role="status">{lista.carregandoMais ? "Carregando mais propostas…" :
          `${exibidos.length} ${exibidos.length === 1 ? "proposta exibida" : "propostas exibidas"}`}</p>}
        {(lista.temMais || lista.carregandoMais) && !lista.erro && (
          <button
            type="button"
            className={s.atalho}
            aria-disabled={!buscarAoRolar}
            onClick={() => {
              if (!buscarAoRolar) return;
              proximoFoco.current = exibidos.length;
              carregarMais();
            }}
          >
            Carregar mais propostas
          </button>
        )}
        {lista.erro && <button type="button" className={s.atalho} onClick={lista.tentarDeNovo}>Tentar de novo</button>}
      </div>
    </>
  );
}

export default function MyOffersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [aviso] = useState(() => location.state?.aviso);
  const avisoNoHistorico = Boolean(location.state?.aviso);

  useEffect(() => {
    if (avisoNoHistorico) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [avisoNoHistorico, location.pathname, location.search, navigate]);
  const filtros = useFiltrosNegociacao(STATUS_NEGOCIACAO);
  const { aba, side, status, page, atualizar } = filtros;
  const painel = useRef(null);

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Propostas">
        Acompanhe as ofertas de cartas que você recebeu e enviou. Quando o dono aceita, a troca nasce e as cartas ficam
        reservadas.
      </CabecalhoPagina>

      <Aviso sucesso={aviso} />

      <div className={s.filtros}>
        <AbasNegociacao
          rotulo="Ofertas"
          idPainel={PAINEL}
          aba={aba}
          onAba={(valor) => atualizar({ aba: valor })}
          status={status}
          onStatus={(valor) => atualizar({ status: valor })}
          rotulosStatus={STATUS_NEGOCIACAO}
        />
      </div>

      <div ref={painel} tabIndex={-1} role="tabpanel" id={PAINEL} aria-labelledby={idDaAba(PAINEL, aba)}>
        <ListaPropostas key={`${side}-${status}-${page}`} filtros={filtros} painel={painel} />
      </div>
    </div>
  );
}
