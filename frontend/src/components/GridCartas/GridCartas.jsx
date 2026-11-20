import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { searchCards } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import Aviso from "../Aviso/Aviso";
import GradeCartas from "../GradeCartas/GradeCartas";
import { IDIOMA_PADRAO, IDIOMA_RESERVA } from "../../utils/idioma";
import styles from "./GridCartas.module.css";

const TOTAL = 8;

async function maisDesejadas(lang) {
  const { items } = await searchCards({ name: "", lang, page: 1, limit: TOTAL, sort: "wanted", order: "desc" });
  return { cartas: items.filter((carta) => carta.wishlistCount > 0), lang };
}

async function maisDesejadasComReserva() {
  const emPortugues = await maisDesejadas(IDIOMA_PADRAO);
  if (emPortugues.cartas.length > 0) return emPortugues;
  return maisDesejadas(IDIOMA_RESERVA);
}

export default function GridCartas() {
  const { dados, erro, carregando, recarregar } = useCarregar(maisDesejadasComReserva, "grid-mais-desejadas");

  const cartas = dados?.cartas ?? [];
  const lang = dados?.lang ?? IDIOMA_PADRAO;
  const verTodas = lang === IDIOMA_PADRAO
    ? "/catalogo?sort=wanted&order=desc"
    : `/catalogo?sort=wanted&order=desc&lang=${lang}`;

  if (!carregando && !erro && cartas.length === 0) return null;

  return (
    <section className={styles.secao} aria-labelledby="grid-cartas-titulo">
      <div className={styles.container}>
        <header className={styles.cabecalho}>
          <h2 id="grid-cartas-titulo" className={styles.titulo}>
            Mais desejadas
          </h2>

          <Link to={verTodas} className={styles.verTodas}>
            Ver todas
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <Aviso erro={erro} onTentarDeNovo={recarregar} />

        {!erro && (
          <GradeCartas cartas={cartas} lang={lang} carregando={carregando} total={TOTAL} />
        )}
      </div>
    </section>
  );
}
