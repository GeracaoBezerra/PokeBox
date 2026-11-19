import { Link } from "react-router-dom";
import { updateOfferStatus } from "../../api/offers";
import { createTrade } from "../../api/trades";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/paginas.module.css";
import { CONDICOES, STATUS_NEGOCIACAO, formatarData, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import MiniaturaCarta from "../MiniaturaCarta/MiniaturaCarta";

export default function CartaoOferta({ oferta, recebida, virouTroca, onMudou }) {
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const { listing } = oferta;
  const aberta = oferta.status === "PROPOSED";
  const aceitaSemTroca = oferta.status === "ACCEPTED" && !virouTroca;

  async function responder(status, mensagem) {
    const { ok } = await acao.executar(() => updateOfferStatus(oferta.id, status), mensagem);
    if (ok) onMudou();
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
          <MiniaturaCarta card={listing.card} legendas={[`${oferta.quantity}× ${listing.card.name}`]} />
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
              <MiniaturaCarta
                key={item.collectionItemId}
                card={item.card}
                legendas={[`${item.quantity}× ${variante(item)} · ${CONDICOES[item.condition]}`]}
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
          <button className={s.botao} disabled={acao.ocupado} onClick={aceitar}>
            Aceitar
          </button>
        )}
        {recebida && (aberta || aceitaSemTroca) && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado}
            onClick={recusar}
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
            onClick={cancelar}
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
