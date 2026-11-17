import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { listListings } from "../../api/listings";
import { useCarregar } from "../../hooks/useCarregar";
import CartaAnuncio from "../CartaAnuncio/CartaAnuncio";
import GradeCartas, { ItemGrade } from "../GradeCartas/GradeCartas";
import styles from "../GridCartas/GridCartas.module.css";

export default function AnunciosRecentes() {
  const { dados, erro, carregando } = useCarregar(
    () => listListings({ page: 1, limit: 6 }), "anuncios-recentes"
  );
  if (erro || (!carregando && !dados?.items.length)) return null;
  return (
    <section className={styles.secao} aria-labelledby="anuncios-recentes-titulo">
      <div className={styles.container}>
        <header className={styles.cabecalho}>
          <h2 id="anuncios-recentes-titulo" className={styles.titulo}>Anúncios recentes</h2>
          <Link to="/marketplace" className={styles.verTodas}>Ver marketplace <ArrowRight size={16} aria-hidden="true" /></Link>
        </header>
        <GradeCartas variante="catalogo" carregando={carregando} total={6}>
          {dados?.items.map((anuncio) => (
            <ItemGrade key={anuncio.id}><CartaAnuncio anuncio={anuncio} /></ItemGrade>
          ))}
        </GradeCartas>
      </div>
    </section>
  );
}
