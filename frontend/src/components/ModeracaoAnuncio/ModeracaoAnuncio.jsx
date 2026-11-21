import { updateListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/detalheCarta.module.css";
import Aviso from "../Aviso/Aviso";

export default function ModeracaoAnuncio({ anuncio, onMudou, atualizando = false }) {
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const dono = anuncio.owner.username;

  async function mudarStatus(status, mensagem) {
    const { ok } = await acao.executar(() => updateListing(anuncio.id, { status }), mensagem);
    if (ok) onMudou();
  }

  async function bloquear() {
    const confirmou = await pedir({
      titulo: `Bloquear o anúncio de @${dono}?`,
      mensagem: "Ele sai do marketplace, e as ofertas abertas e aceitas sem troca são canceladas.",
      textoConfirmar: "Bloquear",
      perigo: true,
    });
    if (confirmou) mudarStatus("BLOCKED", "Anúncio bloqueado.");
  }

  async function desbloquear() {
    const confirmou = await pedir({
      titulo: `Desbloquear o anúncio de @${dono}?`,
      mensagem: "Ele volta como pausado. O dono decide quando ativar de novo.",
      textoConfirmar: "Desbloquear",
    });
    if (confirmou) mudarStatus("PAUSED", "Anúncio desbloqueado (volta como pausado).");
  }

  return (
    <section className={s.moderacao} aria-label="Moderação do anúncio">
      <h3>Moderação</h3>
      <p className={s.suave}>Bloquear retira o anúncio da comunidade. Desbloquear devolve o anúncio como pausado.</p>
      <div className={s.acoes}>
        {["ACTIVE", "PAUSED", "IN_TRADE"].includes(anuncio.status) && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado || atualizando}
            onClick={bloquear}
          >
            Bloquear
          </button>
        )}
        {anuncio.status === "BLOCKED" && (
          <button
            className={s.botaoSecundario}
            disabled={acao.ocupado || atualizando}
            onClick={desbloquear}
          >
            Desbloquear
          </button>
        )}
      </div>
      {anuncio.status === "CLOSED" && <p className={s.suave}>Este anúncio já foi encerrado.</p>}
      <Aviso erro={acao.erro} />
    </section>
  );
}
