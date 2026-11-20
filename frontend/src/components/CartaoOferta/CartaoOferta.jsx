import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Layers, Store, UserRound, X } from "lucide-react";
import { updateOfferStatus } from "../../api/offers";
import { createTrade } from "../../api/trades";
import { useAcao } from "../../hooks/useAcao";
import { avisarQuePendenciasMudaram } from "../../hooks/usePendencias";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import { CONDICOES, STATUS_NEGOCIACAO, formatarData, proximoPassoOferta, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import vitrine from "../../styles/vitrine.module.css";
import s from "./CartaoOferta.module.css";

const LIMITE_PREVIA = 2;

function Cartas({ itens, className }) {
  return (
    <ul className={className} role="list">
      {itens.map((item) => (
        <li className={s.carta} key={item.collectionItemId ?? item.card.id}>
          <Link className={s.miniatura} to={`/cards/${item.card.id}`}>
            <ImagemCarta className={s.imagem} src={item.card.image?.large ?? item.card.image?.small ?? item.card.imageUrl} alt={item.card.name} />
          </Link>
          <div className={s.infoCarta}>
            <div className={s.linhaNome}>
              <p className={s.nomeCarta}>{item.card.name}</p>
              <span className={s.quantidade}>{item.quantity}×</span>
            </div>
            {item.card.setName && <p className={s.detalhes}>{item.card.setName}</p>}
            <p className={s.detalhes}>{variante(item)} · {CONDICOES[item.condition]}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LadoOferta({ titulo, itens, virouTroca }) {
  const dialogo = useRef(null);
  const tituloGaleria = useId();
  const [aberto, setAberto] = useState(false);

  return (
    <section className={s.lado} aria-label={titulo}>
      <h3>{titulo}</h3>
      {itens.length > 0
        ? <Cartas className={s.previa} itens={itens.slice(0, LIMITE_PREVIA)} />
        : <p className={s.detalhes}>{virouTroca ? "Cartas transferidas para a troca." : "Cartas liberadas."}</p>}
      {itens.length > 1 && (
        <>
          <button type="button" className={s.verPacote} data-so-compacto={itens.length <= LIMITE_PREVIA}
            aria-haspopup="dialog" onClick={() => {
              setAberto(true);
              dialogo.current.showModal();
            }}
          >
            <Layers size={16} aria-hidden="true" /> Ver as {itens.length} cartas
          </button>
          <dialog ref={dialogo} className={`${vitrine.modalFiltros} ${s.galeria}`} aria-labelledby={tituloGaleria}
            onClose={() => setAberto(false)}
            onClick={(evento) => { if (evento.target === evento.currentTarget) dialogo.current.close(); }}
          >
            <header className={vitrine.modalCabecalho}>
              <h2 id={tituloGaleria}>{titulo} · {itens.length} cartas</h2>
              <button type="button" className={vitrine.fecharModal} aria-label="Fechar galeria" onClick={() => dialogo.current.close()}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            {aberto && <div className={vitrine.modalConteudo}><Cartas className={s.cartasGaleria} itens={itens} /></div>}
          </dialog>
        </>
      )}
    </section>
  );
}

export default function CartaoOferta({ oferta, recebida, virouTroca, atualizando, onMudou }) {
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const { listing } = oferta;
  const aberta = oferta.status === "PROPOSED";
  const aceitaSemTroca = oferta.status === "ACCEPTED" && !virouTroca;
  const parceiro = recebida ? oferta.proposer : listing.owner;
  const anunciada = [{ ...listing.item, card: listing.card, quantity: oferta.quantity }];
  const ocupado = acao.ocupado || atualizando;

  async function responder(status, mensagem) {
    const { ok } = await acao.executar(() => updateOfferStatus(oferta.id, status), mensagem);
    if (!ok) return;
    avisarQuePendenciasMudaram();
    onMudou();
  }

  async function confirmarEResponder(pedido, status, mensagem) {
    const confirmou = await pedir({ textoCancelar: "Voltar", ...pedido });
    if (confirmou) responder(status, mensagem);
  }

  function aceitar() {
    confirmarEResponder(
      {
        titulo: `Aceitar a oferta de @${oferta.proposer.username}?`,
        mensagem: `@${oferta.proposer.username} poderá criar a troca, que reserva as cartas dos dois lados.`,
        textoConfirmar: "Aceitar oferta",
      },
      "ACCEPTED",
      "Oferta aceita."
    );
  }

  function recusar() {
    confirmarEResponder(
      {
        titulo: `Recusar a oferta de @${oferta.proposer.username}?`,
        mensagem: "Não dá para reabrir depois.",
        textoConfirmar: "Recusar oferta",
        perigo: true,
      },
      "REJECTED",
      "Oferta recusada."
    );
  }

  function cancelar() {
    confirmarEResponder(
      {
        titulo: `Cancelar sua oferta para @${listing.owner.username}?`,
        mensagem: "Não dá para reabrir depois.",
        textoConfirmar: "Cancelar oferta",
        perigo: true,
      },
      "CANCELED",
      "Oferta cancelada."
    );
  }

  async function criarTroca() {
    const { ok } = await acao.executar(
      () => createTrade(oferta.id),
      "Troca criada: as cartas dos dois lados estão reservadas. Veja em Trocas."
    );
    if (!ok) return;
    avisarQuePendenciasMudaram();
    onMudou();
  }

  return (
    <article className={s.cartao} data-cy="cartao-oferta">
      <header className={s.cabecalho}>
        <span className={s.avatar}><UserRound size={20} aria-hidden="true" /></span>
        <div className={s.identidade}>
          <h2><Link to={`/u/${parceiro.username}`}>{recebida ? "De" : "Para"} @{parceiro.username}</Link></h2>
          <time className={s.detalhes} dateTime={oferta.createdAt}>{formatarData(oferta.createdAt)}</time>
        </div>
        <span className={s.status} data-status={virouTroca ? "TRADE" : oferta.status}>
          {virouTroca ? "Virou troca" : STATUS_NEGOCIACAO[oferta.status]}
        </span>
      </header>

      <div className={s.comparacao}>
        <LadoOferta titulo="Você dá" itens={recebida ? anunciada : oferta.items} virouTroca={virouTroca} />
        <ArrowRightLeft className={s.setas} size={18} aria-hidden="true" />
        <LadoOferta titulo="Você recebe" itens={recebida ? oferta.items : anunciada} virouTroca={virouTroca} />
      </div>

      {oferta.message && <blockquote className={s.mensagem}>“{oferta.message}”</blockquote>}
      <Aviso erro={acao.erro} />

      <footer className={s.rodape}>
        <div className={s.contexto}>
          <p className={s.detalhes}>
            {proximoPassoOferta({ status: oferta.status, recebida, virouTroca, dono: listing.owner.username, proponente: oferta.proposer.username })}
          </p>
          <Link className={s.anuncio} to={`/marketplace/${listing.id}`}>
            <Store size={16} aria-hidden="true" /> Ver anúncio
          </Link>
        </div>
        <div className={s.acoes}>
          {recebida && (aberta || aceitaSemTroca) && (
            <button type="button" className={s.perigo} disabled={ocupado} onClick={recusar}>
              Recusar
            </button>
          )}
          {!recebida && (aberta || aceitaSemTroca) && (
            <button type="button" className={s.perigo} disabled={ocupado} onClick={cancelar}>
              Cancelar oferta
            </button>
          )}
          {recebida && aberta && (
            <button type="button" className={s.primaria} disabled={ocupado} onClick={aceitar}>
              Aceitar
            </button>
          )}
          {!recebida && aceitaSemTroca && (
            <button type="button" className={s.primaria} disabled={ocupado} onClick={criarTroca}>
              Criar troca
            </button>
          )}
          {virouTroca && (
            <Link className={s.primaria} to="/trocas">
              Ver troca
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
