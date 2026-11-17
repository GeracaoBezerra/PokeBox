import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowLeftRight } from "lucide-react";
import s from "../../styles/detalheCarta.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";

export default function AnunciosDaCarta({ listings }) {
  return (
    <section className={s.secao} id="anuncios-carta" aria-labelledby="titulo-anuncios">
      <header className={s.cabecalho}>
        <span className={s.eyebrow}>Encontre sua próxima troca</span>
        <h2 id="titulo-anuncios">Disponível na comunidade <span className={s.contador}>{listings.length}</span></h2>
        <p className={s.suave}>Escolha um anúncio para conhecer a carta e oferecer uma troca.</p>
      </header>
      {listings.length === 0 ? (
        <div className={s.vazio}>
          <ArrowLeftRight size={28} aria-hidden="true" /><h3>Nenhum anúncio por enquanto</h3>
          <p>Explore outras cartas disponíveis para troca na comunidade.</p>
          <Link className={s.botaoSecundario} to="/marketplace">Explorar marketplace</Link>
        </div>
      ) : (
        <ul className={s.anuncios}>
          {listings.map((anuncio) => (
            <li className={s.anuncio} key={anuncio.id}>
              <div className={s.anuncioTopo}><span className={s.avatar} aria-hidden="true">{anuncio.owner.username.slice(0, 1).toUpperCase()}</span><Link className={s.link} to={`/u/${anuncio.owner.username}`}>@{anuncio.owner.username}</Link></div>
              <h3>{variante(anuncio.item)}</h3>
              <p className={s.suave}>{CONDICOES[anuncio.item.condition]} · {anuncio.quantity} {anuncio.quantity === 1 ? "disponível" : "disponíveis"}</p>
              <Link className={s.botaoSecundario} to={`/marketplace/${anuncio.id}`}>Ver anúncio <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
