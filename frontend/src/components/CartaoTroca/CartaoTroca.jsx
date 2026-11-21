import { acceptTrade, cancelTrade, rejectTrade } from "../../api/trades";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import { avisarQuePendenciasMudaram } from "../../hooks/usePendencias";
import s from "../../styles/paginas.module.css";
import {
  CONDICOES,
  STATUS_TROCA,
  confirmacoesDaTroca,
  descreverCartas,
  formatarData,
  proximoPassoTroca,
  variante,
} from "../../utils/rotulos";
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
  const { euConfirmei, parceiroConfirmou } = confirmacoesDaTroca(troca, souDonoDoAnuncio);
  const podeConfirmar = emAndamento && !euConfirmei;

  async function agir(fn, mensagem) {
    const { ok } = await acao.executar(() => fn(troca.id), mensagem);
    if (!ok) return;
    avisarQuePendenciasMudaram();
    onMudou();
  }

  async function confirmarRecebimento() {
    const confirmou = await pedir({
      titulo: "Confirmar que recebeu as cartas?",
      mensagem: `Você dá: ${descreverCartas(dou)}. Você recebe: ${descreverCartas(recebo)}. Quando você e @${parceiro.username} confirmarem, as cartas mudam de dono e não dá para desfazer.`,
      textoConfirmar: "Confirmar recebimento",
      textoCancelar: "Voltar",
    });
    if (!confirmou) return;
    const mensagem = parceiroConfirmou
      ? "Troca concluída: as cartas mudaram de dono."
      : `Recebimento confirmado. Aguardando @${parceiro.username} confirmar.`;
    agir(acceptTrade, mensagem);
  }

  async function recusar() {
    const confirmou = await pedir({
      titulo: "Recusar a troca?",
      mensagem: "As cartas reservadas voltam a ficar disponíveis e ninguém recebe nada.",
      textoConfirmar: "Recusar troca",
      textoCancelar: "Voltar",
      perigo: true,
    });
    if (confirmou) agir(rejectTrade, "Troca recusada. A reserva foi liberada.");
  }

  async function cancelar() {
    const confirmou = await pedir({
      titulo: "Cancelar a troca?",
      mensagem: "As cartas reservadas voltam a ficar disponíveis e ninguém recebe nada.",
      textoConfirmar: "Cancelar troca",
      textoCancelar: "Voltar",
      perigo: true,
    });
    if (confirmou) agir(cancelTrade, "Troca cancelada. A reserva foi liberada.");
  }

  return (
    <div className={s.cartaoNegociacao} data-pendente={podeConfirmar} data-cy="cartao-troca">
      <div className={s.acoes}>
        <span className={s.status}>{STATUS_TROCA[troca.status]}</span>
        <span className={s.suave}>
          com @{parceiro.username} · criada em {formatarData(troca.createdAt)}
          {troca.completedAt && ` · finalizada em ${formatarData(troca.completedAt)}`}
        </span>
      </div>
      <p className={s.proximoPasso}>
        {proximoPassoTroca({ status: troca.status, euConfirmei, parceiroConfirmou, parceiro: parceiro.username })}
      </p>

      <div className={s.linhaCartas}>
        <Lado titulo="Você dá" itens={dou} />
        <span aria-hidden="true">⇄</span>
        <Lado titulo="Você recebe" itens={recebo} />
      </div>

      <div className={s.acoes}>
        {podeConfirmar && (
          <button className={s.botao} disabled={acao.ocupado} onClick={confirmarRecebimento}>
            Confirmar recebimento
          </button>
        )}
        {souDonoDoAnuncio && emAndamento && (
          <button className={s.botaoPerigo} disabled={acao.ocupado} onClick={recusar}>
            Recusar troca
          </button>
        )}
        {!souDonoDoAnuncio && emAndamento && (
          <button className={s.botaoPerigo} disabled={acao.ocupado} onClick={cancelar}>
            Cancelar troca
          </button>
        )}
      </div>
      <Aviso erro={acao.erro} />
    </div>
  );
}
