import { Link, useNavigate } from "react-router-dom";
import { ArrowRightLeft, Store, UserRound } from "lucide-react";
import { updateOfferStatus } from "../../api/offers";
import { useAcao } from "../../hooks/useAcao";
import { avisarQuePendenciasMudaram } from "../../hooks/usePendencias";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import { STATUS_NEGOCIACAO, formatarData, proximoPassoOferta } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import LadoNegociacao from "../LadoNegociacao/LadoNegociacao";
import s from "../../styles/cartaoNegociacao.module.css";

function rotuloDoStatus({ virouTroca, statusDaTroca, emEspera, status }) {
  if (statusDaTroca === "ACCEPTED") return { chave: "ACCEPTED", texto: "Troca concluída" };
  if (statusDaTroca === "REJECTED" || statusDaTroca === "CANCELED") return { chave: "UNDONE", texto: "Troca desfeita" };
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
  const statusDaTroca = oferta.tradeStatus ?? null;
  const selo = rotuloDoStatus({ virouTroca, statusDaTroca, emEspera, status: oferta.status });
  const linkDaTroca = `/trocas?aba=${recebida ? "recebidas" : "enviadas"}${statusDaTroca ? `&status=${statusDaTroca}` : ""}`;

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
        <LadoNegociacao titulo="Você dá" itens={recebida ? anunciada : oferta.items} />
        <ArrowRightLeft className={s.setas} size={18} aria-hidden="true" />
        <LadoNegociacao titulo="Você recebe" itens={recebida ? oferta.items : anunciada} />
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
              statusDaTroca,
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
