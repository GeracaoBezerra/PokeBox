import { acceptTrade, cancelTrade, rejectTrade } from "../../api/trades";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/paginas.module.css";
import { CONDICOES, STATUS_TROCA, formatarData, variante } from "../../utils/rotulos";
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
  const parceiro = souDonoDoAnuncio ? troca.proposer : troca.recipient;
  const eu = souDonoDoAnuncio ? troca.recipient : troca.proposer;
  const dou = troca.items.filter((item) => item.from === eu.username);
  const recebo = troca.items.filter((item) => item.to === eu.username);
  const emAndamento = troca.status === "PROPOSED";

  async function agir(fn, mensagem) {
    const { ok } = await acao.executar(() => fn(troca.id), mensagem);
    if (ok) onMudou();
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
              onClick={() => agir(acceptTrade, "Troca concluída: as cartas mudaram de dono.")}
            >
              Concluir troca
            </button>
            <button
              className={s.botaoPerigo}
              disabled={acao.ocupado}
              onClick={() => agir(rejectTrade, "Troca recusada. A reserva foi liberada.")}
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
              onClick={() => agir(cancelTrade, "Troca cancelada. A reserva foi liberada.")}
            >
              Cancelar troca
            </button>
            <span className={s.suave}>Aguardando @{parceiro.username} concluir.</span>
          </>
        )}
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </div>
  );
}
