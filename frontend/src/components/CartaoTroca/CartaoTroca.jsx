import { acceptTrade, cancelTrade, rejectTrade } from "../../api/trades";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/paginas.module.css";
import { CONDICOES, STATUS_TROCA, descreverCartas, formatarData, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import MiniaturaCarta from "../MiniaturaCarta/MiniaturaCarta";

function Lado({ titulo, itens }) {
  return (
    <div>
      <div className={s.suave}>{titulo}</div>
      <div className={s.linhaCartas}>
        {itens.map((item, indice) => (
          <MiniaturaCarta
            key={`${item.card.id}-${indice}`}
            card={item.card}
            legendas={[`${item.quantity}× ${item.card.name}`, `${variante(item)} · ${CONDICOES[item.condition]}`]}
          />
        ))}
      </div>
    </div>
  );
}

export default function CartaoTroca({ troca, souDonoDoAnuncio, onMudou }) {
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const parceiro = souDonoDoAnuncio ? troca.proposer : troca.recipient;
  const eu = souDonoDoAnuncio ? troca.recipient : troca.proposer;
  const dou = troca.items.filter((item) => item.from === eu.username);
  const recebo = troca.items.filter((item) => item.to === eu.username);
  const emAndamento = troca.status === "PROPOSED";

  async function agir(fn, mensagem) {
    const { ok } = await acao.executar(() => fn(troca.id), mensagem);
    if (ok) onMudou();
  }

  async function concluir() {
    const confirmou = await pedir({
      titulo: `Concluir a troca com @${parceiro.username}?`,
      mensagem: `As cartas mudam de dono agora e não dá para desfazer. Você dá: ${descreverCartas(dou)}. Você recebe: ${descreverCartas(recebo)}.`,
      textoConfirmar: "Concluir troca",
      textoCancelar: "Voltar",
    });
    if (confirmou) agir(acceptTrade, "Troca concluída: as cartas mudaram de dono.");
  }

  async function recusar() {
    const confirmou = await pedir({
      titulo: "Recusar a troca?",
      mensagem: "As cartas reservadas voltam a ficar disponíveis.",
      textoConfirmar: "Recusar troca",
      textoCancelar: "Voltar",
      perigo: true,
    });
    if (confirmou) agir(rejectTrade, "Troca recusada. A reserva foi liberada.");
  }

  async function cancelar() {
    const confirmou = await pedir({
      titulo: "Cancelar a troca?",
      mensagem: "As cartas reservadas voltam a ficar disponíveis.",
      textoConfirmar: "Cancelar troca",
      textoCancelar: "Voltar",
      perigo: true,
    });
    if (confirmou) agir(cancelTrade, "Troca cancelada. A reserva foi liberada.");
  }

  return (
    <div className={s.cartaoNegociacao}>
      <div className={s.acoes}>
        <span className={s.status}>{STATUS_TROCA[troca.status]}</span>
        <span className={s.suave}>
          com @{parceiro.username} · criada em {formatarData(troca.createdAt)}
          {troca.completedAt && ` · finalizada em ${formatarData(troca.completedAt)}`}
        </span>
      </div>

      <div className={s.linhaCartas}>
        <Lado titulo="Você dá" itens={dou} />
        <span aria-hidden="true">⇄</span>
        <Lado titulo="Você recebe" itens={recebo} />
      </div>

      <div className={s.acoes}>
        {souDonoDoAnuncio && emAndamento && (
          <>
            <button
              className={s.botao}
              disabled={acao.ocupado}
              onClick={concluir}
            >
              Concluir troca
            </button>
            <button
              className={s.botaoPerigo}
              disabled={acao.ocupado}
              onClick={recusar}
            >
              Recusar
            </button>
          </>
        )}
        {!souDonoDoAnuncio && emAndamento && (
          <>
            <button
              className={s.botaoPerigo}
              disabled={acao.ocupado}
              onClick={cancelar}
            >
              Cancelar troca
            </button>
            <span className={s.suave}>Aguardando @{parceiro.username} concluir.</span>
          </>
        )}
      </div>
      <Aviso erro={acao.erro} />
    </div>
  );
}
