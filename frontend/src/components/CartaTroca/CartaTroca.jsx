import { Link } from "react-router-dom";

import ImagemCarta from "../ImagemCarta/ImagemCarta";
import styles from "./CartaTroca.module.css";

// Miniatura de uma das cartas da troca, com legenda embaixo.
// A largura vem da variável CSS --carta-troca (definida no TrocaItem).
export default function CartaTroca({ carta, rotulo }) {
  return (
    <figure className={styles.carta}>
      {/* TODO: criar a rota /cards/:id */}
      <Link to={`/cards/${carta.id}`} className={styles.link}>
        <ImagemCarta
          className={styles.imagem}
          src={carta.src}
          alt={`${carta.nome}, ${carta.set}, ${carta.numero}`}
        />
      </Link>

      <figcaption className={styles.legenda}>
        <span className={styles.rotulo}>{rotulo}</span>
        <span className={styles.nome}>
          {carta.quantidade > 1 ? `${carta.quantidade}× ` : ""}
          {carta.nome}
        </span>
      </figcaption>
    </figure>
  );
}