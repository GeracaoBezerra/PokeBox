import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import ImagemCarta from "../ImagemCarta/ImagemCarta";

export default function CartaMini({ to, src, nome, children }) {
  return (
    <Link to={to} className={s.cartaMini}>
      <ImagemCarta src={src} alt={nome} />
      <strong>{nome}</strong>
      {children}
    </Link>
  );
}
