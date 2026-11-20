import { useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Layers, Store, UserRound, X } from "lucide-react";
import { updateOfferStatus } from "../../api/offers";
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

function rotuloDoStatus({ virouTroca, emEspera, status }) {
  if (virouTroca) return { chave: "TRADE", texto: "Virou troca" };
  if (emEspera) return { chave: "ON_HOLD", texto: "Em espera" };
  return { chave: status, texto: STATUS_NEGOCIACAO[status] };
}

export default function CartaoOferta({ oferta, recebida, atualizando, onMudou }) {
  const acao = useAcao();
  const navigate = useNavigate();
  const { pedir } = useConfirmacao();
  const { listing } = oferta;
  const aberta = oferta.status === "PROPOSED";
  const virouTroca = Boolean(oferta.tradeId);
  const emEspera = aberta && Boolean(oferta.onHold);
  const parceiro = recebida ? oferta.proposer : listing.owner;
  const anunciada = [{ ...listing.item, card: listing.card, quantity: oferta.quantity }];
  const ocupado = acao.ocupado || atualizando;
  const selo = rotuloDoStatus({ virouTroca, emEspera, status: oferta.status });
  const linkDaTroca = `/trocas?aba=${recebida ? "recebidas" : "enviadas"}`;

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

  async function aceitar() {
    const confirmou = await pedir({
      titulo: `Aceitar a oferta de @${oferta.proposer.username}?`,
      mensagem: "Aceitar cria a troca na hora e reserva as cartas dos dois lados. Depois, cada um confirma quando receber as cartas.",
      textoConfirmar: "Aceitar oferta",
      textoCancelar: "Voltar",
    });
    if (!confirmou) return;
    const { ok } = await acao.executar(
      () => updateOfferStatus(oferta.id, "ACCEPTED"),
      "Oferta aceita: a troca foi criada e as cartas estão reservadas."
    );
    if (!ok) return;
    avisarQuePendenciasMudaram();
    navigate("/trocas?aba=recebidas&status=PROPOSED");
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

  return (
    <article className={s.cartao} data-cy="cartao-oferta">
      <header className={s.cabecalho}>
        <span className={s.avatar}><UserRound size={20} aria-hidden="true" /></span>
        <div className={s.identidade}>
          <h2><Link to={`/u/${parceiro.username}`}>{recebida ? "De" : "Para"} @{parceiro.username}</Link></h2>
          <time className={s.detalhes} dateTime={oferta.createdAt}>{formatarData(oferta.createdAt)}</time>
        </div>
        <span className={s.status} data-status={selo.chave}>{selo.texto}</span>
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
            {proximoPassoOferta({
              status: oferta.status,
              recebida,
              virouTroca,
              emEspera,
              statusDoAnuncio: listing.status,
              cancelReason: oferta.cancelReason,
              dono: listing.owner.username,
              proponente: oferta.proposer.username,
            })}
          </p>
          <Link className={s.anuncio} to={`/marketplace/${listing.id}`}>
            <Store size={16} aria-hidden="true" /> Ver anúncio
          </Link>
        </div>
        <div className={s.acoes}>
          {recebida && aberta && (
            <button type="button" className={s.perigo} disabled={ocupado} onClick={recusar}>
              Recusar
            </button>
          )}
          {!recebida && aberta && (
            <button type="button" className={s.perigo} disabled={ocupado} onClick={cancelar}>
              Cancelar oferta
            </button>
          )}
          {recebida && aberta && (
            <button type="button" className={s.primaria} disabled={ocupado || emEspera} onClick={aceitar}>
              Aceitar
            </button>
          )}
          {virouTroca && (
            <Link className={s.primaria} to={linkDaTroca}>
              Ver troca
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
