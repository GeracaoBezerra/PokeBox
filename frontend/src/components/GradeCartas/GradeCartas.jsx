import { useEffect, useState } from "react";
import { getCard } from "../../api/cards";
import CartaCard from "../CartaCard/CartaCard";
import SkeletonCard from "../SkeletonCard/SkeletonCard";
import styles from "./GradeCartas.module.css";

function temPainelLateral() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 601px)").matches;
}

// Em telas com painel lateral, carrega o detalhe assim que a carta entra na
// grade. O SkeletonCard inteiro permanece até lista e detalhe estarem prontos.
function ItemCarta({ carta, lang }) {
  const [detalhe, setDetalhe] = useState(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!temPainelLateral()) return;
    let cancelado = false;

    getCard(carta.id, lang)
      .then((resposta) => {
        if (!cancelado) setDetalhe(resposta.card);
      })
      .catch(() => {
        if (!cancelado) setFalhou(true);
      });

    return () => {
      cancelado = true;
    };
  }, [carta.id, lang]);

  const precisaDetalhe = temPainelLateral();
  if (precisaDetalhe && detalhe == null && !falhou) {
    return (
      <li className={styles.item} aria-busy="true">
        <SkeletonCard />
      </li>
    );
  }

  return (
    <li className={styles.item}>
      <CartaCard
        carta={{ ...carta, ...detalhe }}
        lang={lang}
        painel={detalhe != null}
      />
    </li>
  );
}

// Só apresenta: recebe as cartas como a API devolve e monta a grade.
// Não busca a lista, então serve à home e ao catálogo (que é paginado).
export function ItemGrade({ children }) {
  return <li className={styles.item}>{children}</li>;
}

export default function GradeCartas({
  children,
  cartas = [],
  lang = "en",
  carregando = false,
  total = 12,
  variante = "padrao",
}) {
  return (
    <ul className={`${styles.grade} ${variante === "catalogo" ? styles.catalogo : ""}`} role="list" aria-busy={carregando}>
      {carregando
        ? // Esqueleto com a mesma proporção da carta: a altura da seção
          // não muda quando os dados chegam (evita o rodapé "pular")
          Array.from({ length: total }, (_, indice) => (
            <li key={indice} className={styles.item} aria-hidden="true">
              <SkeletonCard />
            </li>
          ))
        : children ??
          cartas.map((carta) => (
            <ItemCarta key={`${lang}:${carta.id}`} carta={carta} lang={lang} />
          ))}
    </ul>
  );
}
