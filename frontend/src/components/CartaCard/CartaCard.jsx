import { Link } from "react-router-dom";

import ImagemCarta from "../ImagemCarta/ImagemCarta";
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
    link = `/cards/${id}`,
  } = carta;
  const alt = [nome, set, numero].filter(Boolean).join(", ");
  const temDados = [tipo, raridade, set, artista, wishlist, ranking].some((valor) => valor != null);

  return (
    <div className={styles.carta} data-tipo={tipoKey}>
      <div className={styles.palco}>
        <Link to={link} className={styles.link}>
          {src ? (
            <img
              className={styles.imagem}
              src={src}
              alt={alt}
              width="245"
              height="342"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <ImagemCarta className={styles.imagem} alt={alt} />
          )}
        </Link>

        {/* Painel de dados: é só um resumo visual, os mesmos dados estarão
            na página da carta. */}
        {temDados && (
          <div className={styles.painel} aria-hidden="true">
            <p className={styles.nome}>{nome}</p>

            <dl className={styles.lista}>
              {tipo && (
                <Linha rotulo="Tipo">
                  <span className={styles.tipo}>{tipo}</span>
                </Linha>
              )}
              {raridade && <Linha rotulo="Raridade">{raridade}</Linha>}
              {set && (
                <Linha rotulo="Set">
                  {set} · {numero}
                </Linha>
              )}
              {artista && <Linha rotulo="Artista">{artista}</Linha>}
              {wishlist != null && (
                <Linha rotulo="Wishlists" className="dados">
                  {wishlist.toLocaleString("pt-BR")}
                </Linha>
              )}
              {ranking != null && (
                <Linha rotulo="Ranking" className={`dados ${styles.ranking}`}>
                  #{ranking}
                </Linha>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}