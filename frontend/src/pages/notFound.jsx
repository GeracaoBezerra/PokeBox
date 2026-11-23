import { ArrowUpRight, Home, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import s from "./notFound.module.css";

export default function NotFoundPage() {
  return (
    <section className={s.pagina} aria-labelledby="titulo-nao-encontrado">
      <div className={s.conteudo}>
        <div className={s.texto}>
          <p className={s.selo}><span aria-hidden="true" /> Fora da coleção</p>
          <p className={s.codigo} aria-label="Erro 404">404</p>
          <h1 id="titulo-nao-encontrado">Página não encontrada.</h1>
          <p className={s.descricao}>
            O endereço pode ter mudado ou não existir. Você pode voltar para a página inicial
            ou procurar sua próxima carta no catálogo.
          </p>
          <nav className={s.acoes} aria-label="Para onde ir">
            <Link className={s.principal} to="/">
              <Home size={18} aria-hidden="true" />
              Ir para a página inicial
            </Link>
            <Link className={s.secundario} to="/catalogo">
              <Search size={18} aria-hidden="true" />
              Explorar o catálogo
              <ArrowUpRight className={s.seta} size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>

        <div className={s.ilustracao} aria-hidden="true">
          <Sparkles className={s.brilhoSuperior} size={22} />
          <span className={s.orbita} />
          <div className={s.carta}>
            <div className={s.cabecalhoCarta}>
              <span>POKEBOX</span>
              <span>?</span>
            </div>
            <div className={s.arteCarta}>
              <span className={s.numeroCarta}>404</span>
              <span className={s.pontoCarta} />
              <span className={s.linhaCarta} />
            </div>
            <div className={s.rodapeCarta}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <Sparkles className={s.brilhoInferior} size={16} />
          <span className={s.sombraCarta} />
        </div>
      </div>
    </section>
  );
}
