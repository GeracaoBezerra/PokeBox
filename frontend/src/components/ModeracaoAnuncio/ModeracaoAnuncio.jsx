import { updateListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/paginas.module.css";
import Aviso from "../Aviso/Aviso";

export default function ModeracaoAnuncio({ anuncio, onMudou }) {
  const acao = useAcao();

  async function mudarStatus(status, mensagem) {
    const { ok } = await acao.executar(() => updateListing(anuncio.id, { status }), mensagem);
    if (ok) onMudou();
  }

  return (
    <div className={`${s.secao} ${s.painel}`}>
      <h3>Moderação (ADMIN)</h3>
      <div className={s.acoes}>
        {(anuncio.status === "ACTIVE" || anuncio.status === "PAUSED") && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado}
            onClick={() => mudarStatus("BLOCKED", "Anúncio bloqueado.")}
          >
            Bloquear
          </button>
        )}
        {anuncio.status === "BLOCKED" && (
          <button
            className={s.botaoSecundario}
            disabled={acao.ocupado}
            onClick={() => mudarStatus("PAUSED", "Anúncio desbloqueado (volta como pausado).")}
          >
            Desbloquear
          </button>
        )}
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </div>
  );
}
