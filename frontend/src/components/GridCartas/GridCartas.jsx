import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { listMostWished } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import CartaCard from "../CartaCard/CartaCard";
import GradeCartas, { ItemGrade } from "../GradeCartas/GradeCartas";
import styles from "./GridCartas.module.css";

export default function GridCartas() {
  const { dados, erro, carregando } = useCarregar(() => listMostWished(8), "mais-desejadas");
  if (erro || (!carregando && !dados?.length)) return null;
  return (
    <section id="mais-desejadas" className={styles.secao} aria-labelledby="grid-cartas-titulo">
      <div className={styles.container}>
        <header className={styles.cabecalho}>
          <h2 id="grid-cartas-titulo" className={styles.titulo}>Mais desejadas</h2>
          <Link to="/catalogo" className={styles.verTodas}>Explorar catálogo <ArrowRight size={16} aria-hidden="true" /></Link>
        </header>
        <GradeCartas carregando={carregando} total={8}>
          {dados?.map(({ card, wishlistCount, rank }) => (
            <ItemGrade key={card.id}><CartaCard carta={card} wishlistCount={wishlistCount} rank={rank} /></ItemGrade>
          ))}
        </GradeCartas>
      </div>
    </section>
  );
}
