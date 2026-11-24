import SkeletonCard from "../SkeletonCard/SkeletonCard";
import s from "../../styles/paginas.module.css";
import styles from "./CarregandoCartas.module.css";

export default function CarregandoCartas({ formato = "grade", total = 12 }) {
  return (
    <div role="status" aria-label="Carregando cartas" aria-busy="true">
      {formato === "tabela" ? (
        <div className={styles.linhas} aria-hidden="true">
          {Array.from({ length: total }, (_, indice) => (
            <div className={styles.linha} key={indice}>
              <div className={s.miniatura}><SkeletonCard /></div>
              <div className={styles.texto} />
            </div>
          ))}
        </div>
      ) : (
        <div className={s.grade} aria-hidden="true">
          {Array.from({ length: total }, (_, indice) => <SkeletonCard key={indice} />)}
        </div>
      )}
    </div>
  );
}
