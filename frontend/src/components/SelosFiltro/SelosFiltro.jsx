import styles from "./SelosFiltro.module.css";

export default function SelosFiltro({ selos, onRemover, onLimpar }) {
  if (selos.length === 0) return null;

  return (
    <ul className={styles.selos} aria-label="Filtros ativos">
      {selos.map((selo) => (
        <li key={selo.campo}>
          <button
            type="button"
            className={styles.selo}
            onClick={() => onRemover(selo.campo)}
            aria-label={`Remover filtro ${selo.rotulo}`}
          >
            {selo.rotulo} <span aria-hidden="true">×</span>
          </button>
        </li>
      ))}
      {selos.length > 1 && (
        <li>
          <button type="button" className={styles.limpar} onClick={onLimpar}>
            Limpar filtros
          </button>
        </li>
      )}
    </ul>
  );
}
