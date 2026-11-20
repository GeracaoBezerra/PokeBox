import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { listMyOffers } from "../api/offers";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoOferta from "../components/CartaoOferta/CartaoOferta";
import { idDaAba } from "../components/Abas/idDaAba";
import Paginacao from "../components/Paginacao/Paginacao";
import { Link, useLocation } from "react-router-dom";
import { useCarregar } from "../hooks/useCarregar";
import { useFiltrosNegociacao } from "../hooks/useFiltrosNegociacao";
import s from "../styles/paginas.module.css";
import { STATUS_NEGOCIACAO } from "../utils/rotulos";

const VAZIO = {
  recebidas: { texto: "Nenhuma oferta recebida. Seus anúncios aparecem no marketplace.", para: "/anuncios", link: "Ver meus anúncios" },
  enviadas: { texto: "Você ainda não fez ofertas.", para: "/marketplace", link: "Explorar o marketplace" },
};

const PAINEL = "painel-propostas";

async function carregarPropostas(side, status, page) {
  const [ofertas, trocas] = await Promise.all([listMyOffers({ side, status, page }), listMyTrades()]);
  const ofertasComTroca = new Set([...trocas.sent, ...trocas.received].map((troca) => troca.offerId));
  return { ...ofertas, ofertasComTroca };
}

export default function MyOffersPage() {
  const aviso = useLocation().state?.aviso;
  const { aba, side, status, page, atualizar } = useFiltrosNegociacao(STATUS_NEGOCIACAO);
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => carregarPropostas(side, status, page),
    JSON.stringify({ side, status, page })
  );

  const lista = carregando ? [] : dados?.items ?? [];
  const vazia = !carregando && dados && lista.length === 0;

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Propostas">
        Ofertas que você recebeu nos seus anúncios e que você fez nos anúncios dos outros. Depois que o dono aceita, quem
        ofertou cria a troca.
      </CabecalhoPagina>

      <Aviso sucesso={aviso} />

      <AbasNegociacao
        rotulo="Ofertas"
        idPainel={PAINEL}
        aba={aba}
        onAba={(valor) => atualizar({ aba: valor })}
        status={status}
        onStatus={(valor) => atualizar({ status: valor })}
        rotulosStatus={STATUS_NEGOCIACAO}
      />

      <div role="tabpanel" id={PAINEL} aria-labelledby={idDaAba(PAINEL, aba)}>
        <Aviso erro={erro} onTentarDeNovo={recarregar} />
        {carregando && <CarregandoCartas formato="negociacoes" total={4} />}
        {vazia && page > 1 && <p className={s.suave}>Nenhuma oferta nesta página.</p>}
        {vazia && page === 1 && status && (
          <div className={s.acoes}>
            <p className={s.suave}>Nada com este status.</p>
            <button type="button" className={s.botaoSecundario} onClick={() => atualizar({ status: "" })}>
              Ver todos os status
            </button>
          </div>
        )}
        {vazia && page === 1 && !status && (
          <div className={s.acoes}>
            <p className={s.suave}>{VAZIO[aba].texto}</p>
            <Link className={s.link} to={VAZIO[aba].para}>
              {VAZIO[aba].link}
            </Link>
          </div>
        )}

        <div className={s.gradeNegociacoes}>
          {lista.map((oferta) => (
            <CartaoOferta
              key={oferta.id}
              oferta={oferta}
              recebida={aba === "recebidas"}
              virouTroca={dados.ofertasComTroca.has(oferta.id)}
              onMudou={recarregar}
            />
          ))}
        </div>

        {dados && !carregando && (lista.length > 0 || page > 1) && (
          <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={(nova) => atualizar({ page: nova }, false)} />
        )}
      </div>
    </div>
  );
}
