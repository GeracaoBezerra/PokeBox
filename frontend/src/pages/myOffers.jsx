import { useState } from "react";
import { Link } from "react-router-dom";
import { listMyOffers, updateOfferStatus } from "../api/offers";
import { createTrade, listMyTrades } from "../api/trades";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, STATUS_NEGOCIACAO, formatarData, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

async function carregarPropostas(status) {
  const [ofertas, trocas] = await Promise.all([listMyOffers(status), listMyTrades()]);
  const ofertasComTroca = new Set([...trocas.sent, ...trocas.received].map((troca) => troca.offerId));
  return { ...ofertas, ofertasComTroca };
}

function CartaPequena({ card, legenda }) {
  return (
    <Link to={`/cards/${card.id}`} title={card.name}>
      <ImagemCarta className={s.miniatura} src={card.imageUrl} alt={card.name} />
      {legenda && <div className={s.suave}>{legenda}</div>}
    </Link>
  );
}

function CartaoOferta({ oferta, recebida, virouTroca, onMudou }) {
  const acao = useAcao();
  const { listing } = oferta;
  const aberta = oferta.status === "PROPOSED";
  const aceitaSemTroca = oferta.status === "ACCEPTED" && !virouTroca;

  async function responder(status, mensagem) {
    const { ok } = await acao.executar(() => updateOfferStatus(oferta.id, status), mensagem);
    if (ok) onMudou();
  }

  async function criarTroca() {
    const { ok } = await acao.executar(
      () => createTrade(oferta.id),
      "Troca criada: as cartas dos dois lados estão reservadas. Veja em Trocas."
    );
    if (ok) onMudou();
  }

  return (
    <div className={s.cartaoNegociacao}>
      <div className={s.acoes}>
        <span className={s.status}>{virouTroca ? "Virou troca" : STATUS_NEGOCIACAO[oferta.status]}</span>
        <span className={s.suave}>
          {recebida ? `De @${oferta.proposer.username}` : `Para @${listing.owner.username}`} · {formatarData(oferta.createdAt)}
        </span>
      </div>

      <div className={s.linhaCartas}>
        <div>
          <div className={s.suave}>{recebida ? "Você dá" : "Você recebe"}</div>
          <CartaPequena card={listing.card} legenda={`${oferta.quantity}× ${listing.card.name}`} />
          <div className={s.suave}>
            {variante(listing.item)} · {CONDICOES[listing.item.condition]}
          </div>
        </div>
        <span aria-hidden="true">⇄</span>
        <div>
          <div className={s.suave}>{recebida ? "Você recebe" : "Você dá"}</div>
          <div className={s.linhaCartas}>
            {oferta.items.length === 0 && <span className={s.suave}>cartas liberadas</span>}
            {oferta.items.map((item) => (
              <CartaPequena
                key={item.collectionItemId}
                card={item.card}
                legenda={`${item.quantity}× ${variante(item)} · ${CONDICOES[item.condition]}`}
              />
            ))}
          </div>
        </div>
      </div>

      {oferta.message && <p>"{oferta.message}"</p>}

      <div className={s.acoes}>
        <Link className={s.link} to={`/marketplace/${listing.id}`}>
          Ver anúncio
        </Link>
        {recebida && aberta && (
          <button className={s.botao} disabled={acao.ocupado} onClick={() => responder("ACCEPTED", "Oferta aceita.")}>
            Aceitar
          </button>
        )}
        {recebida && (aberta || aceitaSemTroca) && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado}
            onClick={() => responder("REJECTED", "Oferta recusada.")}
          >
            Recusar
          </button>
        )}
        {!recebida && aceitaSemTroca && (
          <button className={s.botao} disabled={acao.ocupado} onClick={criarTroca}>
            Criar troca
          </button>
        )}
        {!recebida && (aberta || aceitaSemTroca) && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado}
            onClick={() => responder("CANCELED", "Oferta cancelada.")}
          >
            Cancelar oferta
          </button>
        )}
        {virouTroca && (
          <Link className={s.link} to="/trocas">
            Ver troca
          </Link>
        )}
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </div>
  );
}

export default function MyOffersPage() {
  const [aba, setAba] = useState("received");
  const [status, setStatus] = useState("");
  const { dados, erro, carregando, recarregar } = useCarregar(() => carregarPropostas(status), status);

  const lista = dados?.[aba] ?? [];

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Propostas</h1>
      <p className={s.subtitulo}>
        Ofertas que você recebeu nos seus anúncios e que você fez nos anúncios dos outros. Depois que o dono aceita, quem
        ofertou cria a troca.
      </p>

      <div className={s.abas}>
        <button className={aba === "received" ? s.abaAtiva : s.aba} onClick={() => setAba("received")}>
          Recebidas {dados ? `(${dados.received.length})` : ""}
        </button>
        <button className={aba === "sent" ? s.abaAtiva : s.aba} onClick={() => setAba("sent")}>
          Enviadas {dados ? `(${dados.sent.length})` : ""}
        </button>
        <label className={s.campo}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_NEGOCIACAO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Aviso erro={erro} />
      {carregando && !dados && <p className={s.suave}>Carregando...</p>}
      {dados && lista.length === 0 && <p className={s.suave}>Nenhuma oferta aqui.</p>}

<div className={`${s.grade} ${s.gradeLarga}`}>
        {lista.map((oferta) => (
          <CartaoOferta
            key={oferta.id}
            oferta={oferta}
            recebida={aba === "received"}
            virouTroca={dados.ofertasComTroca.has(oferta.id)}
            onMudou={recarregar}
          />
        ))}
      </div>
    </div>
  );
}
