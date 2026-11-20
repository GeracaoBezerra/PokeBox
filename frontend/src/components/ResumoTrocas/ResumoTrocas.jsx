import { Link } from "react-router-dom";
import { STATUS_TROCA } from "../../utils/rotulos";
import PainelPerfil from "../PainelPerfil/PainelPerfil";
import styles from "./ResumoTrocas.module.css";

export default function ResumoTrocas({ resumo }) {
  if (resumo.total === 0) {
    return (
      <PainelPerfil titulo="Minhas trocas">
        <div className={styles.corpo}>
          <p className={styles.suave}>Você ainda não fez nenhuma troca.</p>
          <Link className={styles.link} to="/marketplace">
            Explorar o marketplace
          </Link>
        </div>
      </PainelPerfil>
    );
  }

  const contagens = [
    { rotulo: STATUS_TROCA.ACCEPTED, valor: resumo.concluidas },
    { rotulo: STATUS_TROCA.PROPOSED, valor: resumo.emAndamento },
    { rotulo: `${STATUS_TROCA.REJECTED} ou ${STATUS_TROCA.CANCELED.toLowerCase()}`, valor: resumo.encerradas },
  ];

  return (
    <PainelPerfil titulo="Minhas trocas">
      <div className={styles.corpo}>
        <dl className={styles.contagens}>
          {contagens.map(({ rotulo, valor }) => (
            <div key={rotulo} className={styles.contagem}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
        {resumo.esperandoVoce > 0 && (
          <Link className={styles.destaque} to="/trocas?aba=recebidas&status=PROPOSED">
            {resumo.esperandoVoce === 1 ? "1 troca esperando você concluir" : `${resumo.esperandoVoce} trocas esperando você concluir`}
          </Link>
        )}
        <Link className={styles.link} to="/trocas">
          Ver todas as trocas
        </Link>
      </div>
    </PainelPerfil>
  );
}
