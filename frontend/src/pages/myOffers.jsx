import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { listMyOffers } from "../api/offers";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoOferta from "../components/CartaoOferta/CartaoOferta";
import Paginacao from "../components/Paginacao/Paginacao";
import { useCarregar } from "../hooks/useCarregar";
import { useFiltrosNegociacao } from "../hooks/useFiltrosNegociacao";
import s from "../styles/paginas.module.css";
import { STATUS_NEGOCIACAO } from "../utils/rotulos";

async function carregarPropostas(side, status, page) {
  const [ofertas, trocas] = await Promise.all([listMyOffers({ side, status, page }), listMyTrades()]);
  const ofertasComTroca = new Set([...trocas.sent, ...trocas.received].map((troca) => troca.offerId));
  return { ...ofertas, ofertasComTroca };
}

export default function MyOffersPage() {
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

      <AbasNegociacao
        aba={aba}
        onAba={(valor) => atualizar({ aba: valor })}
        status={status}
        onStatus={(valor) => atualizar({ status: valor })}
        rotulosStatus={STATUS_NEGOCIACAO}
      />

      <Aviso erro={erro} onTentarDeNovo={recarregar} />
      {carregando && <CarregandoCartas formato="negociacoes" total={4} />}
      {vazia && <p className={s.suave}>{page > 1 ? "Nenhuma oferta nesta página." : "Nenhuma oferta aqui."}</p>}

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
  );
}
