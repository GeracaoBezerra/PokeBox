import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listListings } from "../api/listings";
import Aviso from "../components/Aviso/Aviso";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

export default function MarketplacePage() {
  const [params, setParams] = useSearchParams();
  const cardId = params.get("cardId") ?? "";
  const username = params.get("username") ?? "";
  const page = Number(params.get("page") ?? 1);
  const [filtros, setFiltros] = useState({ cardId, username });

  const { dados, erro, carregando } = useCarregar(
    () => listListings({ cardId, username, page, limit: 24 }),
    `${cardId}|${username}|${page}`
  );

  function filtrar(evento) {
    evento.preventDefault();
    const novos = {};
    if (filtros.cardId.trim()) novos.cardId = filtros.cardId.trim();
    if (filtros.username.trim()) novos.username = filtros.username.trim().toLowerCase();
    setParams(novos);
  }

  function irPara(novaPagina) {
    const novos = { page: String(novaPagina) };
    if (cardId) novos.cardId = cardId;
    if (username) novos.username = username;
    setParams(novos);
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Marketplace</h1>
      <p className={s.subtitulo}>Anúncios de troca ativos, mais novos primeiro.</p>

      <form className={s.form} onSubmit={filtrar}>
        <label className={s.campo}>
          Id da carta
          <input
            value={filtros.cardId}
            onChange={(e) => setFiltros({ ...filtros, cardId: e.target.value })}
            placeholder="ex.: base1-4"
          />
        </label>
        <label className={s.campo}>
          Colecionador
          <input
            value={filtros.username}
            onChange={(e) => setFiltros({ ...filtros, username: e.target.value })}
            placeholder="ex.: ash"
          />
        </label>
        <button className={s.botao} type="submit">
          Filtrar
        </button>
      </form>

      <Aviso erro={erro} />
      {carregando && !dados && <p className={s.suave}>Carregando...</p>}

      {dados && (
        <div className={s.secao}>
          {dados.items.length === 0 ? (
            <p className={s.suave}>Nenhum anúncio encontrado.</p>
          ) : (
            <div className={s.grade}>
              {dados.items.map((anuncio) => (
                <Link key={anuncio.id} to={`/marketplace/${anuncio.id}`} className={s.cartaMini}>
                  <ImagemCarta src={anuncio.card.imageUrl} alt={anuncio.card.name} />
                  <strong>{anuncio.card.name}</strong>
                  <span className={s.suave}>
                    {variante(anuncio.item)} · {CONDICOES[anuncio.item.condition]}
                  </span>
                  <span>
                    {anuncio.quantity} disponível · @{anuncio.owner.username}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className={s.paginacao}>
            <button className={s.botaoSecundario} disabled={page <= 1} onClick={() => irPara(page - 1)}>
              Anterior
            </button>
            <span className={s.suave}>Página {page}</span>
            <button
              className={s.botaoSecundario}
              disabled={!dados.pagination?.hasNextPage}
              onClick={() => irPara(page + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
