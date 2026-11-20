import { mensagemAmigavel } from "../../api/mensagens";
import styles from "./Aviso.module.css";

const FORA_DO_AR = [0, 500, 502, 503, 504];

export default function Aviso({ erro, campos, texto, onTentarDeNovo, sucesso }) {
  if (sucesso) {
    return <div className={`${styles.aviso} ${styles.sucesso}`} role="status">{sucesso}</div>;
  }
  if (!erro) return null;

  const podeTentar = onTentarDeNovo && FORA_DO_AR.includes(erro.status);
  return (
    <div className={styles.aviso} role="alert">
      <span>{texto ?? mensagemAmigavel(erro, campos)}</span>
      {podeTentar && (
        <button type="button" className={styles.tentar} onClick={onTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
