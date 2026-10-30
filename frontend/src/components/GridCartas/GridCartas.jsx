import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import CartaCard from "../CartaCard/CartaCard";
import { cartasDestaque } from "../../mocks/mocks";
import styles from "./GridCartas.module.css";

export default function GridCartas() {
  return (
    <section className={styles.secao} aria-labelledby="grid-cartas-titulo">
      <div className={styles.container}>
        <header className={styles.cabecalho}>
          <h2 id="grid-cartas-titulo" className={styles.titulo}>
            Cartas em destaque
          </h2>

          {/* TODO: trocar por "/cards" quando a rota existir */}
          <Link to="/" className={styles.verTodas}>
            Ver todas
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <ul className={styles.grade} role="list">
          {cartasDestaque.map((carta) => (
            <li key={carta.id} className={styles.item}>
              <CartaCard carta={carta} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}