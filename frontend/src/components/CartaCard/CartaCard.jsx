import { Link } from "react-router-dom";

import styles from "./CartaCard.module.css";

// Uma linha "rótulo → valor" do painel de dados.
function Linha({ rotulo, className, children }) {
  return (
    <div className={styles.linha}>
      <dt>{rotulo}</dt>
      <dd className={className}>{children}</dd>
    </div>
  );
}

// Carta do catálogo + painel de dados que abre ao lado dela no hover ou no
// foco por teclado. O lado em que o painel abre vem da variável CSS --lado,
// definida por quem renderiza o card (veja o GridCartas).
export default function CartaCard({ carta }) {
  const {
    id,
    nome,
    set,
    numero,
    raridade,
    artista,
    tipo,
    tipoKey,
    wishlist,
    ranking,
    src,
  } = carta;

  return (
    <div className={styles.carta} data-tipo={tipoKey}>
      <div className={styles.palco}>
        {/* TODO: criar a rota /cards/:id */}
        <Link to={`/cards/${id}`} className={styles.link}>
          <img
            className={styles.imagem}
            src={src}
            alt={`${nome}, ${set}, ${numero}`}
            width="245"
            height="342"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </Link>

        {/* Painel de dados: é só um resumo visual, os mesmos dados estarão
            na página da carta. */}
        <div className={styles.painel} aria-hidden="true">
          <p className={styles.nome}>{nome}</p>

          <dl className={styles.lista}>
            <Linha rotulo="Tipo">
              <span className={styles.tipo}>{tipo}</span>
            </Linha>
            <Linha rotulo="Raridade">{raridade}</Linha>
            <Linha rotulo="Set">
              {set} · {numero}
            </Linha>
            <Linha rotulo="Artista">{artista}</Linha>
            <Linha rotulo="Wishlists" className="dados">
              {wishlist.toLocaleString("pt-BR")}
            </Linha>
            <Linha rotulo="Ranking" className={`dados ${styles.ranking}`}>
              #{ranking}
            </Linha>
          </dl>
        </div>
      </div>
    </div>
  );
}