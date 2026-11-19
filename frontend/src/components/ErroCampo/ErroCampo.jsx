import styles from "./ErroCampo.module.css";

export default function ErroCampo({ id, mensagem }) {
  if (!mensagem) return null;
  return (
    <span id={id} className={styles.erro}>
      {mensagem}
    </span>
  );
}
