import { useSearchParams } from "react-router-dom";
import { searchCards } from "../api/cards";
import Aviso from "../components/Aviso/Aviso";
import BuscaCatalogo from "../components/BuscaCatalogo/BuscaCatalogo";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import Paginacao from "../components/Paginacao/Paginacao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { ListaDeCartas } from "../components/GridCartas/GridCartas";

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const name = params.get("name") ?? "";
  const lang = params.get("lang") ?? "en";
  const page = Number(params.get("page") ?? 1);

  const { dados, erro, carregando } = useCarregar(
    () => searchCards({ name, lang, page, limit: 24 }),
    `${name}|${lang}|${page}`
  );

  function buscar(nome, idioma) {
    setParams({ name: nome, lang: idioma, page: "1" });
  }

  function irPara(novaPagina) {
    setParams({ name, lang, page: String(novaPagina) });
  }

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Catálogo">
        Cartas da TCGdex. Abra uma carta para adicioná-la à coleção ou à wishlist.
      </CabecalhoPagina>

      <BuscaCatalogo nome={name} idioma={lang} onBuscar={buscar} />

      <Aviso erro={erro} />
      {carregando && (
        <div className={s.secao}>
          <ListaDeCartas carregando total={24} />
        </div>
      )}

      {!carregando && dados && (
        <div className={s.secao}>
          {dados.items.length === 0 ? (
            <p className={s.suave}>Nenhuma carta encontrada.</p>
          ) : (
            <ListaDeCartas cartas={dados.items} lang={lang} />
          )}
          <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={irPara} />
        </div>
      )}
    </div>
  );
}
