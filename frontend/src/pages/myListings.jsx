import { useState } from "react";
import { Link } from "react-router-dom";
import { listMyListings, updateListing } from "../api/listings";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

function LinhaAnuncio({ anuncio, onMudou }) {
  const [form, setForm] = useState({ quantity: anuncio.quantity, description: anuncio.description ?? "" });
  const acao = useAcao();
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

  function fechar() {
    if (!window.confirm("Fechar o anúncio? Não dá para reabrir, e as ofertas abertas e aceitas sem troca são canceladas.")) {
      return;
    }
    enviar({ status: "CLOSED" }, "Anúncio fechado.");
  }

  return (
    <>
      <tr>
        <td>
          <ImagemCarta className={s.miniatura} src={anuncio.card.imageUrl} alt={anuncio.card.name} />
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

export default function MyListingsPage() {
  const { dados: anuncios, erro, carregando, recarregar } = useCarregar(listMyListings);

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Meus anúncios</h1>
      <p className={s.subtitulo}>
        Pausar tira do marketplace sem mexer nas ofertas. Fechar é definitivo e cancela as ofertas abertas e as aceitas
        que ainda não viraram troca. Diminuir a quantidade cancela as aceitas que pedem mais do que o novo valor. Para
        anunciar, use a <Link className={s.link} to="/colecao">coleção</Link>.
      </p>

      <Aviso erro={erro} />
      {carregando && !anuncios && <p className={s.suave}>Carregando...</p>}
      {anuncios && anuncios.length === 0 && <p className={s.suave}>Você ainda não anunciou nada.</p>}

      {anuncios && anuncios.length > 0 && (
        <div className={s.tabelaWrap}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th />
                <th>Carta</th>
                <th>Status</th>
                <th>Quantidade</th>
                <th>Descrição</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {anuncios.map((anuncio) => (
                <LinhaAnuncio key={anuncio.id} anuncio={anuncio} onMudou={recarregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
