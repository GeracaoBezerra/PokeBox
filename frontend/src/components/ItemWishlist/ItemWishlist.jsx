import { useId } from "react";
import { Link } from "react-router-dom";
import { Store, Trash2 } from "lucide-react";
import CartaCard from "../CartaCard/CartaCard";
import s from "./ItemWishlist.module.css";

export default function ItemWishlist({ item, ocupado, onRemover }) {
  const tituloId = useId();
  const { card, cardId, opportunities } = item;
  const expansao = [card.setName, card.number].filter(Boolean).join(" · ");
  const oportunidades = opportunities === 0
    ? "Sem oportunidades"
    : `${opportunities} ${opportunities === 1 ? "oportunidade" : "oportunidades"}`;

  return (
    <article className={s.item} aria-labelledby={tituloId} data-cy="item-wishlist">
      <CartaCard carta={card} />
      <div className={s.painel}>
        <div className={s.identidade}>
          <h2 id={tituloId} className={s.nome}>{card.name}</h2>
          {expansao && <p className={s.expansao}>{expansao}</p>}
        </div>
        <p className={s.oportunidades} data-disponivel={opportunities > 0}>
          <Store size={16} aria-hidden="true" />
          <span>{oportunidades}</span>
        </p>
        <div className={s.acoes}>
          <Link className={s.anuncios} to={`/marketplace?cardId=${cardId}`} aria-describedby={tituloId}>
            Ver anúncios
          </Link>
          <button
            type="button"
            className={s.remover}
            aria-label="Remover"
            aria-describedby={tituloId}
            title="Remover da wishlist"
            onClick={(evento) => onRemover(item, evento.currentTarget.closest("article"))}
            disabled={ocupado}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
