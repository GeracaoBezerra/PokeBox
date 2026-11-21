import { Link } from "react-router-dom";
import s from "../../styles/detalheCarta.module.css";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../../utils/rotulos";

export default function DadosAnuncio({ anuncio }) {
  return (
    <>
      <header className={s.cabecalhoCarta}>
        <span className={s.eyebrow}>Anúncio de troca · {anuncio.card.setName}</span>
        <h1>{anuncio.card.name}</h1>
        <div className={s.badges}>
          <span className={s.numero}>Nº {anuncio.card.number}</span>
          {anuncio.card.rarity && <span className={s.badgeDourado}>{anuncio.card.rarity}</span>}
          <span className={s.statusAnuncio} data-status={anuncio.status}>{STATUS_ANUNCIO[anuncio.status]}</span>
        </div>
      </header>
      <div className={s.colecionador}>
        <span className={s.avatar} aria-hidden="true">{anuncio.owner.username.slice(0, 1).toUpperCase()}</span>
        <div><span className={s.suave}>Anunciado por</span><Link className={s.link} to={`/u/${anuncio.owner.username}`}>{anuncio.owner.name} · @{anuncio.owner.username}</Link></div>
      </div>
      <dl className={s.especificacoes}>
        <div><dt>Versão</dt><dd>{variante(anuncio.item)}</dd></div>
        <div><dt>Condição</dt><dd>{CONDICOES[anuncio.item.condition]}</dd></div>
        {anuncio.status === "IN_TRADE" ? (
          <div><dt>Disponíveis</dt><dd>Nenhuma no momento</dd></div>
        ) : (
          <div><dt>{anuncio.status === "ACTIVE" ? "Disponíveis" : "Quantidade anunciada"}</dt><dd>{anuncio.quantity} {anuncio.quantity === 1 ? "cópia" : "cópias"}</dd></div>
        )}
      </dl>
      {anuncio.description && <div className={s.descricaoAnuncio}><h2>Sobre esta carta</h2><p>{anuncio.description}</p></div>}
      <p className={s.suave}>Anúncio publicado em {formatarData(anuncio.createdAt)}</p>
    </>
  );
}
