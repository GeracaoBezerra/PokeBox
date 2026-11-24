import { useId } from "react";
import { Link } from "react-router-dom";
import { EyeOff } from "lucide-react";
import { CONDICOES, variante } from "../../utils/rotulos";
import AcoesItemColecao from "../AcoesItemColecao/AcoesItemColecao";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import s from "./CartaColecao.module.css";

export default function CartaColecao({ item, ocupado, onEditar, onAnunciar, onApagar, onTirar }) {
  const tituloId = useId();
  const { card } = item;
  const expansao = [card.setName, card.number].filter(Boolean).join(" · ");

  return (
    <article className={s.item} aria-labelledby={tituloId} data-cy="item-colecao">
      <Link className={s.imagem} to={`/cards/${encodeURIComponent(item.cardId)}`} tabIndex={-1} aria-hidden="true">
        <ImagemCarta src={card.imageUrl} alt="" />
      </Link>
      <div className={s.painel}>
        <div className={s.identidade}>
          <h2 id={tituloId} className={s.nome}>
            <Link to={`/cards/${encodeURIComponent(item.cardId)}`}>{card.name}</Link>
          </h2>
          {expansao && <p className={s.suave}>{expansao}</p>}
          <p className={s.variante}>
            {variante(item)} · {CONDICOES[item.condition] ?? item.condition}
          </p>
          {!item.isPublic && (
            <span className={s.selo}>
              <EyeOff size={14} aria-hidden="true" /> Privada
            </span>
          )}
        </div>
        <dl className={s.numeros}>
          <div>
            <dt>Quantidade</dt>
            <dd>{item.quantity}</dd>
          </div>
          <div>
            <dt>Reservada</dt>
            <dd>{item.reservedQuantity}</dd>
          </div>
          <div>
            <dt>Disponível</dt>
            <dd>{item.available}</dd>
          </div>
        </dl>
        <AcoesItemColecao
          item={item}
          ocupado={ocupado}
          onEditar={onEditar}
          onAnunciar={onAnunciar}
          onApagar={onApagar}
          onTirar={onTirar}
        />
      </div>
    </article>
  );
}
