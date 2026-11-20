import { useEffect, useState } from "react";
import { getCard } from "../../api/cards";
import CartaCard from "../CartaCard/CartaCard";
import SkeletonCard from "../SkeletonCard/SkeletonCard";
import { IDIOMA_PADRAO } from "../../utils/idioma";
import styles from "./GradeCartas.module.css";

// Busca o detalhe apenas quando a carta recebe hover ou foco, em telas com
// painel lateral. O painel só é liberado quando os dados completos chegam.
function ItemCarta({ carta, lang, acoes }) {
  const [detalhe, setDetalhe] = useState(null);
  const [pedido, setPedido] = useState(false);

  function solicitarDetalhe() {
    if (window.matchMedia("(min-width: 601px)").matches) setPedido(true);
  }

  useEffect(() => {
    if (!pedido) return;
    let cancelado = false;

    getCard(carta.id, lang)
      .then((resposta) => {
        if (!cancelado) setDetalhe(resposta.card);
      })
      .catch(() => {
        // sem detalhe, a carta fica sem painel (o resto continua funcionando)
      });

    return () => {
      cancelado = true;
    };
  }, [pedido, carta.id, lang]);

  return (
    <li className={styles.item} onMouseEnter={solicitarDetalhe} onFocus={solicitarDetalhe}>
      <CartaCard
        carta={{ ...carta, ...detalhe }}
        lang={lang}
        painel={detalhe != null}
        acoes={acoes?.(carta)}
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
  lang = IDIOMA_PADRAO,
  carregando = false,
  total = 12,
  variante = "padrao",
  acoes,
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
            <ItemCarta key={`${lang}:${carta.id}`} carta={carta} lang={lang} acoes={acoes} />
          ))}
    </ul>
  );
}
