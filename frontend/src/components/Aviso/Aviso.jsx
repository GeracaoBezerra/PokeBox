import styles from "./Aviso.module.css";

const FORA_DO_AR = [0, 502, 503, 504];

export default function Aviso({ erro, sucesso, onTentarDeNovo }) {
  if (erro) {
    const podeTentar = onTentarDeNovo && FORA_DO_AR.includes(erro.status);
    return (
      <div className={`${styles.aviso} ${styles.erro}`} role="alert">
        <span>
          {erro.message}
          {erro.status ? <span className={styles.codigo}> ({erro.status})</span> : null}
        </span>
        {podeTentar && (
          <button type="button" className={styles.tentar} onClick={onTentarDeNovo}>
            Tentar de novo
          </button>
        )}
      </div>
    );
  }

  if (sucesso) {
    return (
      <p className={`${styles.aviso} ${styles.sucesso}`} role="status">
        {sucesso}
      </p>
    );
  }

  return null;
}
