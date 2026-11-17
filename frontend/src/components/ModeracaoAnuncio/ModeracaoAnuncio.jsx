import { updateListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/detalheCarta.module.css";
import Aviso from "../Aviso/Aviso";

export default function ModeracaoAnuncio({ anuncio, onMudou, atualizando = false }) {
  const acao = useAcao();

  async function mudarStatus(status, mensagem) {
    const { ok } = await acao.executar(() => updateListing(anuncio.id, { status }), mensagem);
    if (ok) onMudou();
  }

  return (
    <section className={s.moderacao} aria-label="Moderação do anúncio">
      <h3>Moderação</h3>
      <p className={s.suave}>Bloquear retira o anúncio da comunidade. Desbloquear devolve o anúncio como pausado.</p>
      <div className={s.acoes}>
        {(anuncio.status === "ACTIVE" || anuncio.status === "PAUSED") && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado || atualizando}
            onClick={() => mudarStatus("BLOCKED", "Anúncio bloqueado.")}
          >
            Bloquear
          </button>
        )}
        {anuncio.status === "BLOCKED" && (
          <button
            className={s.botaoSecundario}
            disabled={acao.ocupado || atualizando}
            onClick={() => mudarStatus("PAUSED", "Anúncio desbloqueado (volta como pausado).")}
          >
            Desbloquear
          </button>
        )}
      </div>
      {anuncio.status === "CLOSED" && <p className={s.suave}>Este anúncio já foi encerrado.</p>}
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </section>
  );
}
