import styles from "./Aviso.module.css";

export default function Aviso({ erro, sucesso }) {
  if (erro) {
    return (
      <p className={`${styles.aviso} ${styles.erro}`} role="alert">
        {erro.message}
        {erro.status ? <span className={styles.codigo}> ({erro.status})</span> : null}
      </p>
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
