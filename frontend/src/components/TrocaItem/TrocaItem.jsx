import { ArrowLeftRight } from "lucide-react";

import CartaTroca from "../CartaTroca/CartaTroca";
import styles from "./TrocaItem.module.css";

// rotuloData: nome da data em que a troca foi respondida (null = não mostra)
const STATUS = {
  concluida: { texto: "Concluída", classe: styles.concluida, rotuloData: "Aceita em" },
  pendente: { texto: "Em andamento", classe: styles.pendente, rotuloData: null },
  cancelada: { texto: "Cancelada", classe: styles.cancelada, rotuloData: "Cancelada em" },
};

// "T00:00:00" faz o navegador ler a data no fuso local; sem isso,
// "2026-10-12" apareceria como dia 11 no horário do Brasil.
function formatarData(data) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

// Uma linha "rótulo → valor" das informações da troca.
function Linha({ rotulo, children }) {
  return (
    <div className={styles.linha}>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Uma troca: a carta que você dá, a que você recebe e os dados da troca.
export default function TrocaItem({ troca }) {
  const {
    id,
    status,
    parceiro,
    propostaPor,
    propostaEm,
    respondidaEm,
    ofereceu,
    recebeu,
  } = troca;
  const info = STATUS[status];

  return (
    <div className={styles.item}>
      <div className={styles.cartas}>
        <CartaTroca carta={ofereceu} rotulo="Você dá" />
        <ArrowLeftRight className={styles.seta} size={24} aria-hidden="true" />
        <CartaTroca carta={recebeu} rotulo="Você recebe" />
      </div>

      <div className={styles.info}>
        <div className={styles.topo}>
          <p className={styles.codigo}>
            Troca <span className="dados">#{id}</span>
          </p>
          <span className={`${styles.status} ${info.classe}`}>{info.texto}</span>
        </div>

        <dl className={styles.lista}>
          <Linha rotulo="Troca com">@{parceiro}</Linha>
          <Linha rotulo="Proposta por">
            {propostaPor === "voce" ? "Você" : `@${parceiro}`}
          </Linha>
          <Linha rotulo="Proposta em">
            <time dateTime={propostaEm}>{formatarData(propostaEm)}</time>
          </Linha>
          {info.rotuloData && respondidaEm && (
            <Linha rotulo={info.rotuloData}>
              <time dateTime={respondidaEm}>{formatarData(respondidaEm)}</time>
            </Linha>
          )}
        </dl>
      </div>
    </div>
  );
}