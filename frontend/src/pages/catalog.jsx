import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchCards } from "../api/cards";
import Aviso from "../components/Aviso/Aviso";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

const IDIOMAS = { en: "Inglês", pt: "Português", es: "Espanhol", fr: "Francês", de: "Alemão", it: "Italiano", ja: "Japonês" };

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const name = params.get("name") ?? "";
  const lang = params.get("lang") ?? "en";
  const page = Number(params.get("page") ?? 1);
  const [busca, setBusca] = useState(name);
  const [idioma, setIdioma] = useState(lang);

  const { dados, erro, carregando } = useCarregar(
    () => searchCards({ name, lang, page, limit: 24 }),
    `${name}|${lang}|${page}`
  );

  function buscar(evento) {
    evento.preventDefault();
    setParams({ name: busca, lang: idioma, page: "1" });
  }

  function irPara(novaPagina) {
    setParams({ name, lang, page: String(novaPagina) });
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Catálogo</h1>
      <p className={s.subtitulo}>Cartas da TCGdex. Abra uma carta para adicioná-la à coleção ou à wishlist.</p>

      <form className={s.form} onSubmit={buscar}>
        <label className={s.campo}>
          Nome
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: pikachu" />
        </label>
        <label className={s.campo}>
          Idioma
          <select value={idioma} onChange={(e) => setIdioma(e.target.value)}>
            {Object.entries(IDIOMAS).map(([codigo, rotulo]) => (
              <option key={codigo} value={codigo}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <button className={s.botao} type="submit">
          Buscar
        </button>
      </form>

      <Aviso erro={erro} />
      {carregando && <p className={s.suave}>Carregando...</p>}

      {dados && (
        <div className={s.secao}>
          {dados.items.length === 0 ? (
            <p className={s.suave}>Nenhuma carta encontrada.</p>
          ) : (
            <div className={s.grade}>
              {dados.items.map((carta) => (
                <Link key={carta.id} to={`/cards/${carta.id}?lang=${lang}`} className={s.cartaMini}>
                  <ImagemCarta src={carta.image?.small} alt={carta.name} />
                  <strong>{carta.name}</strong>
                  <span className={s.suave}>{carta.id}</span>
                </Link>
              ))}
            </div>
          )}

          <div className={s.paginacao}>
            <button className={s.botaoSecundario} disabled={page <= 1} onClick={() => irPara(page - 1)}>
              Anterior
            </button>
            <span className={s.suave}>Página {page}</span>
            <button
              className={s.botaoSecundario}
              disabled={!dados.pagination?.hasNextPage}
              onClick={() => irPara(page + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
