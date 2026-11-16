import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import ImagemCarta from "../ImagemCarta/ImagemCarta";

export default function MiniaturaCarta({ card, legendas = [] }) {
  return (
    <Link to={`/cards/${card.id}`} title={card.name}>
      <ImagemCarta className={s.miniatura} src={card.imageUrl} alt={card.name} />
      {legendas.map((legenda) => (
        <div key={legenda} className={s.suave}>
          {legenda}
        </div>
      ))}
    </Link>
  );
}
