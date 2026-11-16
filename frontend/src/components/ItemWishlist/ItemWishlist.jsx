import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import ImagemCarta from "../ImagemCarta/ImagemCarta";

export default function ItemWishlist({ item, ocupado, onRemover }) {
  return (
    <div className={s.cartaMini}>
      <Link to={`/cards/${item.cardId}`}>
        <ImagemCarta src={item.card.imageUrl} alt={item.card.name} />
      </Link>
      <strong>{item.card.name}</strong>
      <span className={s.suave}>
        {item.card.setName} · {item.card.number}
      </span>
      <span>
        {item.opportunities} {item.opportunities === 1 ? "oportunidade" : "oportunidades"}
      </span>
      <div className={s.acoes}>
        <Link className={s.link} to={`/marketplace?cardId=${item.cardId}`}>
          Ver anúncios
        </Link>
        <button className={s.botaoPerigo} onClick={() => onRemover(item)} disabled={ocupado}>
          Remover
        </button>
      </div>
    </div>
  );
}
