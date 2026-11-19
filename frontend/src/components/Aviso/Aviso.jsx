import { mensagemAmigavel } from "../../api/mensagens";
import styles from "./Aviso.module.css";

const FORA_DO_AR = [0, 500, 502, 503, 504];

export default function Aviso({ erro, onTentarDeNovo }) {
  if (!erro) return null;

  const podeTentar = onTentarDeNovo && FORA_DO_AR.includes(erro.status);
  return (
    <div className={styles.aviso} role="alert">
      <span>{mensagemAmigavel(erro)}</span>
      {podeTentar && (
        <button type="button" className={styles.tentar} onClick={onTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
