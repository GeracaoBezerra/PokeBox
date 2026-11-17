import { Link } from "react-router-dom";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import { CONDICOES, precoReferencia, variante } from "../../utils/rotulos";
import styles from "./CartaAnuncio.module.css";

export default function CartaAnuncio({ anuncio, naWishlist, seuAnuncio }) {
  const { card, item, owner } = anuncio;
  const preco = precoReferencia(card);

  return (
    <article className={styles.carta}>
      <Link to={`/marketplace/${anuncio.id}`} className={styles.link}>
        <div className={styles.imagem}>
          <ImagemCarta src={card.imageUrl} alt={card.name} />
          {naWishlist && <span className={`${styles.selo} ${styles.wishlist}`}>Na sua wishlist</span>}
          {seuAnuncio && <span className={`${styles.selo} ${styles.seu}`}>Seu anúncio</span>}
        </div>
        <strong>{card.name}</strong>
        <span className={styles.suave}>
          {card.setName} · {card.number}
        </span>
        <span className={styles.suave}>
          {variante(item)} · {CONDICOES[item.condition] ?? item.condition}
        </span>
        <span>{anuncio.quantity} para troca</span>
        {preco && <span className={styles.preco}>{preco}</span>}
      </Link>
      <Link to={`/u/${owner.username}`} className={styles.dono}>
        @{owner.username}
      </Link>
    </article>
  );
}
