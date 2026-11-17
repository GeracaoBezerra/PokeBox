import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { searchCards } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import Aviso from "../Aviso/Aviso";
import GradeCartas from "../GradeCartas/GradeCartas";
import styles from "./GridCartas.module.css";

const TOTAL = 12; // 4 colunas × 3 linhas
const LANG = "en"; // a TCGdex não tem todos os sets em pt; en sempre existe

// Seção "Cartas em destaque" da home: busca as cartas e usa a GradeCartas.
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
          <GradeCartas cartas={cartas} lang={LANG} carregando={carregando} />
        )}

        {!carregando && dados && cartas.length === 0 && (
          <p className={styles.estado}>Nenhuma carta encontrada.</p>
        )}
      </div>
    </section>
  );
}
