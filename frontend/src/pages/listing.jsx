import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listCollection } from "../api/collection";
import { getListing, updateListing } from "../api/listings";
import { createOffer } from "../api/offers";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import { useMe } from "../hooks/useMe";
import s from "../styles/paginas.module.css";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

function FormOferta({ anuncio }) {
  const { dados: colecao, erro: erroColecao } = useCarregar(listCollection);
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [escolhidas, setEscolhidas] = useState({});
  const acao = useAcao();

  const disponiveis = (colecao ?? []).filter((item) => item.available > 0);

  function alternar(item, marcado) {
    setEscolhidas((atual) => {
      const novo = { ...atual };
      if (marcado) novo[item.id] = 1;
      else delete novo[item.id];
      return novo;
    });
  }

  async function enviar(evento) {
    evento.preventDefault();
    const items = Object.entries(escolhidas).map(([collectionItemId, quantity]) => ({
      collectionItemId,
      quantity: Number(quantity),
    }));
    await acao.executar(
      () =>
        createOffer(anuncio.id, {
          quantity: Number(quantidade),
          ...(mensagem.trim() ? { message: mensagem.trim() } : {}),
          items,
        }),
      "Oferta enviada. Acompanhe em Propostas."
    );
  }

  return (
    <form className={`${s.secao} ${s.painel}`} onSubmit={enviar}>
      <h2>Fazer uma oferta</h2>
      <div className={s.form}>
        <label className={s.campo}>
          Quantas cartas do anúncio você quer
          <input
            type="number"
            min="1"
            max={anuncio.quantity}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </label>
        <label className={s.campo}>
          Mensagem (opcional)
          <input value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </label>
      </div>

      <h3 className={s.secao}>O que você oferece em troca (da sua coleção)</h3>
      <Aviso erro={erroColecao} />
      {colecao && disponiveis.length === 0 && (
        <p className={s.suave}>Você não tem cartas disponíveis para oferecer.</p>
      )}
      {disponiveis.length > 0 && (
        <div className={s.tabelaWrap}>
          <table className={s.tabela}>
            <tbody>
              {disponiveis.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Oferecer ${item.card.name}`}
                      checked={item.id in escolhidas}
                      onChange={(e) => alternar(item, e.target.checked)}
                    />
                  </td>
                  <td>
                    <ImagemCarta className={s.miniatura} src={item.card.imageUrl} alt={item.card.name} />
                  </td>
                  <td>
                    {item.card.name}
                    <div className={s.suave}>
                      {variante(item)} · {CONDICOES[item.condition]}
                    </div>
                  </td>
                  <td className={s.suave}>{item.available} disponível</td>
                  <td className={s.campo}>
                    {item.id in escolhidas && (
                      <input
                        type="number"
                        min="1"
                        max={item.available}
                        value={escolhidas[item.id]}
                        onChange={(e) => setEscolhidas({ ...escolhidas, [item.id]: e.target.value })}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={s.acoes}>
        <button
          className={s.botao}
          type="submit"
          disabled={acao.ocupado || Object.keys(escolhidas).length === 0}
        >
          Enviar oferta
        </button>
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </form>
  );
}

export default function ListingPage() {
  const { id } = useParams();
  const me = useMe();
  const { dados: anuncio, erro, carregando, recarregar } = useCarregar(() => getListing(id), id);
  const admin = useAcao();

  if (carregando && !anuncio) return <div className={s.pagina}>Carregando...</div>;
  if (erro) {
    return (
      <div className={s.pagina}>
        <Aviso erro={erro} />
      </div>
    );
  }

  const souDono = me?.username === anuncio.owner.username;
  const souAdmin = me?.role === "ADMIN";
  const podeOfertar = me && !souDono && anuncio.status === "ACTIVE";

  async function mudarStatus(status, mensagem) {
    const { ok } = await admin.executar(() => updateListing(anuncio.id, { status }), mensagem);
    if (ok) recarregar();
  }

  return (
    <div className={s.pagina}>
      <div className={s.detalhe}>
        <ImagemCarta className={s.imagemCarta} src={anuncio.card.imageUrl} alt={anuncio.card.name} />
        <div>
          <h1 className={s.titulo}>{anuncio.card.name}</h1>
          <p className={s.subtitulo}>
            <span className={s.status}>{STATUS_ANUNCIO[anuncio.status]}</span> · anunciado em{" "}
            {formatarData(anuncio.createdAt)}
          </p>
          <dl className={s.lista}>
            <dt>Colecionador</dt>
            <dd>
              <Link className={s.link} to={`/u/${anuncio.owner.username}`}>
                {anuncio.owner.name} (@{anuncio.owner.username})
              </Link>
            </dd>
            <dt>Carta</dt>
            <dd>
              <Link className={s.link} to={`/cards/${anuncio.card.id}`}>
                {anuncio.card.setName} · {anuncio.card.number}
              </Link>
            </dd>
            <dt>Variante</dt>
            <dd>{variante(anuncio.item)}</dd>
            <dt>Condição</dt>
            <dd>{CONDICOES[anuncio.item.condition]}</dd>
            <dt>Quantidade</dt>
            <dd>{anuncio.quantity}</dd>
            {anuncio.description && (
              <>
                <dt>Descrição</dt>
                <dd>{anuncio.description}</dd>
              </>
            )}
          </dl>

          {souDono && (
            <p className={s.secao}>
              Este anúncio é seu.{" "}
              <Link className={s.link} to="/anuncios">
                Gerenciar em Meus anúncios
              </Link>
            </p>
          )}

          {!me && (
            <p className={s.secao}>
              <Link className={s.link} to="/login">
                Entre
              </Link>{" "}
              para fazer uma oferta.
            </p>
          )}

          {souAdmin && !souDono && (
            <div className={`${s.secao} ${s.painel}`}>
              <h3>Moderação (ADMIN)</h3>
              <div className={s.acoes}>
                {(anuncio.status === "ACTIVE" || anuncio.status === "PAUSED") && (
                  <button
                    className={s.botaoPerigo}
                    disabled={admin.ocupado}
                    onClick={() => mudarStatus("BLOCKED", "Anúncio bloqueado.")}
                  >
                    Bloquear
                  </button>
                )}
                {anuncio.status === "BLOCKED" && (
                  <button
                    className={s.botaoSecundario}
                    disabled={admin.ocupado}
                    onClick={() => mudarStatus("PAUSED", "Anúncio desbloqueado (volta como pausado).")}
                  >
                    Desbloquear
                  </button>
                )}
              </div>
              <Aviso erro={admin.erro} sucesso={admin.sucesso} />
            </div>
          )}
        </div>
      </div>

      {podeOfertar && <FormOferta anuncio={anuncio} />}
    </div>
  );
}
