import { useState } from "react";
import { Link } from "react-router-dom";
import { updateListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/paginas.module.css";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import MiniaturaCarta from "../MiniaturaCarta/MiniaturaCarta";

export default function LinhaMeuAnuncio({ anuncio, onMudou }) {
  const [form, setForm] = useState({ quantity: anuncio.quantity, description: anuncio.description ?? "" });
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const aberto = anuncio.status === "ACTIVE" || anuncio.status === "PAUSED";
  const mudou = Number(form.quantity) !== anuncio.quantity || form.description !== (anuncio.description ?? "");

  async function enviar(dados, mensagem) {
    const { ok } = await acao.executar(() => updateListing(anuncio.id, dados), mensagem);
    if (ok) onMudou();
  }

  function salvar() {
    const dados = {};
    if (Number(form.quantity) !== anuncio.quantity) dados.quantity = Number(form.quantity);
    if (form.description !== (anuncio.description ?? "")) dados.description = form.description;
    enviar(dados, "Anúncio atualizado.");
  }

  async function fechar() {
    const confirmou = await pedir({
      titulo: "Fechar anúncio?",
      mensagem: "Não dá para reabrir. Ofertas abertas e aceitas sem troca serão canceladas.",
      textoConfirmar: "Fechar anúncio",
      perigo: true,
    });
    if (!confirmou) return;
    enviar({ status: "CLOSED" }, "Anúncio fechado.");
  }

  return (
    <>
      <tr>
        <td>
          <MiniaturaCarta card={anuncio.card} link={`/marketplace/${anuncio.id}`} />
        </td>
        <td>
          <Link className={s.link} to={`/marketplace/${anuncio.id}`}>
            {anuncio.card.name}
          </Link>
          <div className={s.suave}>
            {variante(anuncio.item)} · {CONDICOES[anuncio.item.condition]} · {formatarData(anuncio.createdAt)}
          </div>
        </td>
        <td>
          <span className={s.status}>{STATUS_ANUNCIO[anuncio.status]}</span>
        </td>
        <td className={s.campo}>
          {aberto ? (
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          ) : (
            anuncio.quantity
          )}
        </td>
        <td className={s.campo}>
          {aberto ? (
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          ) : (
            anuncio.description
          )}
        </td>
        <td>
          {aberto && (
            <div className={s.acoes}>
              <button className={s.botao} onClick={salvar} disabled={!mudou || acao.ocupado}>
                Salvar
              </button>
              {anuncio.status === "ACTIVE" && (
                <button
                  className={s.botaoSecundario}
                  disabled={acao.ocupado}
                  onClick={() => enviar({ status: "PAUSED" }, "Anúncio pausado.")}
                >
                  Pausar
                </button>
              )}
              {anuncio.status === "PAUSED" && (
                <button
                  className={s.botaoSecundario}
                  disabled={acao.ocupado}
                  onClick={() => enviar({ status: "ACTIVE" }, "Anúncio ativado.")}
                >
                  Ativar
                </button>
              )}
              <button className={s.botaoPerigo} disabled={acao.ocupado} onClick={fechar}>
                Fechar
              </button>
            </div>
          )}
        </td>
      </tr>
      {(acao.erro || acao.sucesso) && (
        <tr>
          <td colSpan={6}>
            <Aviso erro={acao.erro} sucesso={acao.sucesso} />
          </td>
        </tr>
      )}
    </>
  );
}
