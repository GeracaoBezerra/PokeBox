import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { getCard, searchCards } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import Aviso from "../Aviso/Aviso";
import CartaCard from "../CartaCard/CartaCard";
import SkeletonCard from "../SkeletonCard/SkeletonCard";
import styles from "./GridCartas.module.css";

const TOTAL = 12; // 4 colunas × 3 linhas
const LANG = "en"; // a TCGdex não tem todos os sets em pt; en sempre existe

// Uma carta da grade. A lista não traz tipo, raridade nem artista, então o
// detalhe é buscado assim que a carta aparece e junta com os dados da lista.
// O painel só é liberado quando o detalhe chegou, para nunca abrir incompleto.
// O backend guarda o detalhe em cache, então depois da primeira vez é rápido.
function ItemCarta({ carta, lang }) {
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
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
  }, [carta.id, lang]);

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
export function ListaDeCartas({
  cartas = [],
  lang,
  carregando = false,
  total = TOTAL,
}) {
  return (
    <ul className={styles.grade} role="list" aria-busy={carregando}>
      {carregando
        ? // Esqueleto com a mesma proporção da carta: a altura da seção
          // não muda quando os dados chegam (evita o rodapé "pular")
          Array.from({ length: total }, (_, indice) => (
            <li key={indice} className={styles.item} aria-hidden="true">
              <SkeletonCard />
            </li>
          ))
        : cartas.map((carta) => (
            <ItemCarta key={carta.id} carta={carta} lang={lang} />
          ))}
    </ul>
  );
}

// Seção "Cartas em destaque" da home: busca as cartas e usa a ListaDeCartas.
export default function GridCartas() {
  // name: "" é igual ao que o catálogo envia quando não há busca
  const { dados, erro, carregando } = useCarregar(
    () => searchCards({ name: "", lang: LANG, page: 1, limit: TOTAL }),
    "grid-destaques",
  );

  const cartas = dados?.items ?? [];

  return (
    <section className={styles.secao} aria-labelledby="grid-cartas-titulo">
      <div className={styles.container}>
        <header className={styles.cabecalho}>
          <h2 id="grid-cartas-titulo" className={styles.titulo}>
            Cartas em destaque
          </h2>

          {/* TODO: trocar por "/cards" quando a rota existir */}
          <Link to="/" className={styles.verTodas}>
            Ver todas
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <Aviso erro={erro} />

        {!erro && (
          <ListaDeCartas cartas={cartas} lang={LANG} carregando={carregando} />
        )}

        {!carregando && dados && cartas.length === 0 && (
          <p className={styles.estado}>Nenhuma carta encontrada.</p>
        )}
      </div>
    </section>
  );
}
