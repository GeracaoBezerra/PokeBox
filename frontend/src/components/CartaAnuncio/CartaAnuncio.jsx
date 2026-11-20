import { Link } from "react-router-dom";
import { CONDICOES, precoReferencia, variante } from "../../utils/rotulos";
import CartaCard from "../CartaCard/CartaCard";
import styles from "./CartaAnuncio.module.css";

const DE_MARKETPLACE = { deMarketplace: true };

export default function CartaAnuncio({ anuncio, naWishlist, seuAnuncio }) {
  const { card, item, owner } = anuncio;
  const destino = `/marketplace/${anuncio.id}`;
  const preco = precoReferencia(card);

  return (
    <div className={styles.anuncio}>
      <CartaCard carta={card} link={destino} estadoLink={DE_MARKETPLACE} />
      <div className={styles.legenda}>
        {(naWishlist || seuAnuncio) && (
          <div className={styles.selos}>
            {naWishlist && <span className={styles.wishlist}>Na sua wishlist</span>}
            {seuAnuncio && <span className={styles.seu}>Seu anúncio</span>}
          </div>
        )}
        <Link to={destino} state={DE_MARKETPLACE} className={styles.nome}>
          {card.name}
        </Link>
        <span className={styles.suave}>
          {variante(item)} · {CONDICOES[item.condition] ?? item.condition}
        </span>
        <span className={styles.suave}>
          {anuncio.quantity} para troca ·{" "}
          <Link to={`/u/${owner.username}`} className={styles.dono}>
            @{owner.username}
          </Link>
        </span>
        {preco && <span className={styles.preco}>{preco}</span>}
      </div>
    </div>
  );
}
