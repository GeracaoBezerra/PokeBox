import PainelPerfil from "../PainelPerfil/PainelPerfil";
import styles from "../HistoricoTrocas/HistoricoTrocas";

const STATUS = {
  concluida: { texto: "Concluída", classe: styles.concluida },
  pendente: { texto: "Em andamento", classe: styles.pendente },
  cancelada: { texto: "Cancelada", classe: styles.cancelada },
};

// "T00:00:00" faz o navegador ler a data no fuso local; sem isso,
// "2026-10-12" apareceria como dia 11 no horário do Brasil.
function formatarData(data) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

// Histórico de trocas: só leitura (o PainelPerfil sem onEditar não mostra
// o botão Editar).
export default function HistoricoTrocas({ trocas }) {
  return (
    <PainelPerfil titulo="Minhas trocas">
      {trocas.length === 0 ? (
        <p className={styles.vazio}>Você ainda não fez nenhuma troca.</p>
      ) : (
        <ul className={styles.lista} role="list">
          {trocas.map((troca) => {
            const status = STATUS[troca.status];

            return (
              <li key={troca.id} className={styles.item}>
                <div>
                  <p className={styles.resumo}>
                    {troca.ofereceu} <span className={styles.por}>por</span>{" "}
                    {troca.recebeu}
                  </p>
                  <p className={styles.detalhe}>
                    com @{troca.parceiro} ·{" "}
                    <time dateTime={troca.data} className="dados">
                      {formatarData(troca.data)}
                    </time>
                  </p>
                </div>

                <span className={`${styles.status} ${status.classe}`}>
                  {status.texto}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </PainelPerfil>
  );
}
