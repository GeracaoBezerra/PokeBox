import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../../utils/rotulos";

export default function DadosAnuncio({ anuncio }) {
  return (
    <>
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
    </>
  );
}
