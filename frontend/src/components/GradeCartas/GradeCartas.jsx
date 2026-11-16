import CartaCard from "../CartaCard/CartaCard";
import styles from "./GradeCartas.module.css";

export default function GradeCartas({ cartas }) {
  return (
    <ul className={styles.grade} role="list">
      {cartas.map((carta) => (
        <li key={carta.id} className={styles.item}>
          <CartaCard carta={carta} />
        </li>
      ))}
    </ul>
  );
}
