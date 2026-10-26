import styles from "./CtaColecao.module.css";
import { Link } from "react-router-dom";

const cartas = [
  { id: 1, src: "", rot: "-12deg", x: "-60%" },
  { id: 2, src: "", rot: "0deg", x: "0%" },
  { id: 3, src: "", rot: "12deg", x: "60%" },
];

export default function CtaColecao() {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContainer}>
        <div>
          <h2>Monte sua coleção</h2>
          <p>Crie sua coleção e faça trocas!</p>

          <Link to="/">
            Monte sua coleção
          </Link>
        </div>

        <div>
            <div>
                <p> leque de cartas </p>
            </div>
        </div>
      </div>
    </section>
  );
}
