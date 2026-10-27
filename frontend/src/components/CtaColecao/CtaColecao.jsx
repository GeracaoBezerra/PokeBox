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
        <div className={styles.ctaText}>
          
          <h2 className={styles.ctaTitle}>Monte sua coleção</h2>
          <p className={styles.ctaDescription}>
            Crie sua coleção e faça trocas. Nosso site tem o objetivo é facilitar a troca de cartas
          </p>

          <Link to="/" className={styles.ctaButton}>
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
