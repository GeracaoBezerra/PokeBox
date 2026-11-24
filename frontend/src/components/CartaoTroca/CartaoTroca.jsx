import { Link } from "react-router-dom";
import { ArrowRightLeft, UserRound } from "lucide-react";
import { acceptTrade, cancelTrade, rejectTrade } from "../../api/trades";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import { avisarQuePendenciasMudaram } from "../../hooks/usePendencias";
import {
  STATUS_TROCA,
  confirmacoesDaTroca,
  descreverCartas,
  formatarData,
  proximoPassoTroca,
} from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import LadoNegociacao from "../LadoNegociacao/LadoNegociacao";
import s from "../../styles/cartaoNegociacao.module.css";

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
    <article className={s.cartao} data-pendente={podeConfirmar} data-cy="cartao-troca">
      <header className={s.cabecalho}>
        <span className={s.avatar}><UserRound size={20} aria-hidden="true" /></span>
        <div className={s.identidade}>
          <h2><Link to={`/u/${parceiro.username}`}>Troca com @{parceiro.username}</Link></h2>
          <p className={s.detalhes}>
            Criada em <time dateTime={troca.createdAt}>{formatarData(troca.createdAt)}</time>
            {troca.completedAt && <> · finalizada em <time dateTime={troca.completedAt}>{formatarData(troca.completedAt)}</time></>}
          </p>
        </div>
        <span className={s.status} data-status={troca.status}>{STATUS_TROCA[troca.status]}</span>
      </header>

      <div className={s.comparacao}>
        <LadoNegociacao titulo="Você dá" itens={dou} />
        <ArrowRightLeft className={s.setas} size={18} aria-hidden="true" />
        <LadoNegociacao titulo="Você recebe" itens={recebo} />
      </div>

      <Aviso erro={acao.erro} />

      <footer className={s.rodape}>
        <p className={`${s.contexto} ${s.proximoPasso}`}>
          {proximoPassoTroca({ status: troca.status, euConfirmei, parceiroConfirmou, parceiro: parceiro.username })}
        </p>
        <div className={s.acoes}>
          {souDonoDoAnuncio && emAndamento && (
            <button type="button" className={s.perigo} disabled={acao.ocupado} onClick={recusar}>
              Recusar troca
            </button>
          )}
          {!souDonoDoAnuncio && emAndamento && (
            <button type="button" className={s.perigo} disabled={acao.ocupado} onClick={cancelar}>
              Cancelar troca
            </button>
          )}
          {podeConfirmar && (
            <button type="button" className={s.primaria} disabled={acao.ocupado} onClick={confirmarRecebimento}>
              Confirmar recebimento
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
