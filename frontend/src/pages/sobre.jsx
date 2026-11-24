import { Link } from "react-router-dom";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import s from "../styles/paginas.module.css";

const REPOSITORIO = "https://github.com/GeracaoBezerra/PokeBox";

export default function SobrePage() {
  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Sobre o PokeBox">
        O PokeBox é uma plataforma de trocas de cartas de Pokémon TCG. Aqui não se vende nada: as cartas mudam de
        dono só por troca.
      </CabecalhoPagina>

      <p className={s.subtitulo}>
        Você monta sua coleção, marca na wishlist as cartas que procura e anuncia as que quer trocar. Outros
        colecionadores mandam ofertas, e a troca acontece em 3 passos: cadastre, marque e troque.{" "}
        <Link className={s.link} to="/#como-funciona">Veja como funciona</Link>.
      </p>

      <p className={s.subtitulo}>
        O PokeBox é um projeto do curso Geração Tech. O código é aberto e está no{" "}
        <a className={s.link} href={REPOSITORIO} target="_blank" rel="noreferrer">
          repositório do GitHub
        </a>
        .
      </p>
    </div>
  );
}
