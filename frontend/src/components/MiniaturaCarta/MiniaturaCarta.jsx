import s from "../../styles/paginas.module.css";
import CartaCard from "../CartaCard/CartaCard";

export default function MiniaturaCarta({ card, legendas = [], link }) {
  return (
    <div className={s.cartaComLegendas}>
      <div className={s.miniatura}>
        <CartaCard carta={card} link={link} painel={false} />
      </div>
      {legendas.map((legenda) => (
        <div key={legenda} className={s.suave}>
          {legenda}
        </div>
      ))}
    </div>
  );
}
