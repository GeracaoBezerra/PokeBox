import PainelPerfil from "../PainelPerfil/PainelPerfil";
import TrocaItem from "../TrocaItem/TrocaItem";
import styles from "./HistoricoTrocas.module.css";

// Histórico de trocas: só leitura (o PainelPerfil sem onEditar não mostra
// o botão Editar). Cada troca é um TrocaItem.
export default function HistoricoTrocas({ trocas }) {
  return (
    <PainelPerfil titulo="Minhas trocas">
      {trocas.length === 0 ? (
        <p className={styles.vazio}>Você ainda não fez nenhuma troca.</p>
      ) : (
        <ul className={styles.lista} role="list">
          {trocas.map((troca) => (
            <li key={troca.id}>
              <TrocaItem troca={troca} />
            </li>
          ))}
        </ul>
      )}
    </PainelPerfil>
  );
}