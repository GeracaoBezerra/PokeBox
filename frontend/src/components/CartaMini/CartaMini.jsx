import s from "../../styles/paginas.module.css";
import CartaCard from "../CartaCard/CartaCard";

export default function CartaMini({ to, carta, children }) {
  return (
    <div className={s.cartaMini}>
      <CartaCard carta={carta} link={to} />
      <strong>{carta.name}</strong>
      {children}
    </div>
  );
}
