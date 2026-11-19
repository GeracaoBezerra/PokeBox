import { updateListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/paginas.module.css";
import Aviso from "../Aviso/Aviso";

const FRASE_ENCERRADO = {
  CLOSED: "Este anúncio foi fechado.",
  BLOCKED: "Este anúncio foi bloqueado pela moderação.",
};

export default function AcoesAnuncio({ anuncio, onMudou, acao: acaoDeFora }) {
  const acaoPropria = useAcao();
  const acao = acaoDeFora ?? acaoPropria;
  const { pedir } = useConfirmacao();

  async function mudar(status, mensagem) {
    const { ok } = await acao.executar(() => updateListing(anuncio.id, { status }), mensagem);
    if (ok) onMudou();
  }

  async function fechar() {
    const confirmou = await pedir({
      titulo: "Fechar anúncio?",
      mensagem: "Não dá para reabrir. As ofertas abertas e as aceitas que ainda não viraram troca serão canceladas.",
      textoConfirmar: "Fechar anúncio",
      perigo: true,
    });
    if (confirmou) mudar("CLOSED", "Anúncio fechado.");
  }

  if (FRASE_ENCERRADO[anuncio.status]) {
    return (
      <>
        <p className={s.suave}>{FRASE_ENCERRADO[anuncio.status]}</p>
        {!acaoDeFora && <Aviso erro={acao.erro} sucesso={acao.sucesso} />}
      </>
    );
  }

  return (
    <>
      <div className={s.acoes}>
        {anuncio.status === "ACTIVE" && (
          <button className={s.botaoSecundario} disabled={acao.ocupado} onClick={() => mudar("PAUSED", "Anúncio pausado.")}>
            Pausar
          </button>
        )}
        {anuncio.status === "PAUSED" && (
          <button className={s.botaoSecundario} disabled={acao.ocupado} onClick={() => mudar("ACTIVE", "Anúncio ativado.")}>
            Ativar
          </button>
        )}
        <button className={s.botaoPerigo} disabled={acao.ocupado} onClick={fechar}>
          Fechar
        </button>
      </div>
      {!acaoDeFora && <Aviso erro={acao.erro} sucesso={acao.sucesso} />}
    </>
  );
}
