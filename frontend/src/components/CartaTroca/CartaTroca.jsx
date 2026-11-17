import CartaCard from "../CartaCard/CartaCard";
import styles from "./CartaTroca.module.css";

// Miniatura de uma das cartas da troca, com legenda embaixo.
// A largura vem da variável CSS --carta-troca (definida no TrocaItem).
export default function CartaTroca({ carta, rotulo }) {
  return (
    <figure className={styles.carta}>
      <CartaCard
        carta={{ ...carta, name: carta.nome, setName: carta.set, number: carta.numero, imageUrl: carta.src }}
        painel={false}
      />

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
