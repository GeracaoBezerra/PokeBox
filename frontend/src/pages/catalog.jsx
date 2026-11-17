import { useSearchParams } from "react-router-dom";
import { SearchX, X } from "lucide-react";
import { searchCards } from "../api/cards";
import Aviso from "../components/Aviso/Aviso";
import BuscaCatalogo from "../components/BuscaCatalogo/BuscaCatalogo";
import FiltrosCatalogo from "../components/FiltrosCatalogo/FiltrosCatalogo";
import Paginacao from "../components/Paginacao/Paginacao";
import { ListaDeCartas } from "../components/GridCartas/GridCartas";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/catalogo.module.css";

const CAMPOS_FILTRO = ["category", "type", "rarity", "set"];
const ROTULOS = { category: "Categoria", type: "Tipo", rarity: "Raridade", set: "Expansão" };

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const name = params.get("name") ?? "";
  const lang = params.get("lang") ?? "en";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const filtros = Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, params.get(campo) ?? ""]));
  const sort = params.get("sort") === "name" ? "name" : undefined;
  const order = params.get("order") === "desc" ? "desc" : "asc";
  const ordenacao = sort ? `name-${order}` : "relevance";
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => searchCards({ name, lang, page, limit: 24, ...filtros, sort, order }),
    JSON.stringify({ name, lang, page, ...filtros, sort, order })
  );

  function atualizar(mudancas, reiniciarPagina = true) {
    const novos = new URLSearchParams(params);
    for (const [campo, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(campo, String(valor));
      else novos.delete(campo);
    }
    if (reiniciarPagina) novos.delete("page");
    setParams(novos);
  }

  function buscar(nome, idioma) {
    const limparIdioma = idioma !== lang ? Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ""])) : {};
    atualizar({ name: nome.trim(), lang: idioma, ...limparIdioma });
  }

  function ordenar(valor) {
    atualizar({ sort: valor === "relevance" ? "" : "name", order: valor === "name-desc" ? "desc" : "" });
  }

  function limparFiltros() {
    atualizar(Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ""])));
  }

  const ativos = CAMPOS_FILTRO.filter((campo) => filtros[campo]);

  return (
    <div className={s.pagina}>
      <header className={s.cabecalho}>
        <span className={s.eyebrow}>Explore o universo Pokémon TCG</span>
        <h1>Catálogo de cartas</h1>
        <p>Encontre sua próxima carta, complete sua coleção e descubra novas possibilidades de troca.</p>
      </header>
      <div className={s.barra}>
        <BuscaCatalogo key={`${name}|${lang}`} nome={name} idioma={lang} onBuscar={buscar} />
        <label className={s.campo}>Ordenar por
          <select value={ordenacao} onChange={(e) => ordenar(e.target.value)}>
            <option value="relevance">Relevância</option>
            <option value="name-asc">Nome: A–Z</option>
            <option value="name-desc">Nome: Z–A</option>
            <option value="rarity" disabled>Raridade — em breve</option>
            <option value="recent" disabled>Mais recentes — em breve</option>
            <option value="wanted" disabled>Mais desejadas — em breve</option>
          </select>
        </label>
      </div>
      <div className={s.layout}>
        <FiltrosCatalogo lang={lang} filtros={filtros} onAlterar={(campo, valor) => atualizar({ [campo]: valor })} onLimpar={limparFiltros} onAplicar={(novosFiltros) => atualizar(novosFiltros)} />
        <section className={s.resultados} aria-label="Resultados do catálogo">
          <div className={s.resumo} role="status">
            <p>{name ? <>Resultados para <strong>“{name}”</strong></> : "Todas as cartas"}</p>
            <span>{carregando ? "Buscando cartas…" : dados ? `${dados.items.length} cartas nesta página` : ""}</span>
          </div>
          {ativos.length > 0 && <div className={s.chips}>{ativos.map((campo) => <button key={campo} onClick={() => atualizar({ [campo]: "" })} aria-label={`Remover filtro ${ROTULOS[campo]}: ${filtros[campo]}`}>{ROTULOS[campo]}: {filtros[campo]} <X size={14} aria-hidden="true" /></button>)}</div>}
          <Aviso erro={erro} />
          {erro && <button className={s.botao} onClick={recarregar}>Tentar novamente</button>}
          {carregando && <ListaDeCartas carregando total={24} variante="catalogo" />}
          {!carregando && dados && (
            <>
              {dados.items.length ? <ListaDeCartas cartas={dados.items} lang={lang} variante="catalogo" /> : (
                <div className={s.vazio}><SearchX size={32} aria-hidden="true" /><h2>Nenhuma carta encontrada</h2><p>Tente outro nome ou ajuste os filtros para ampliar a busca.</p>{ativos.length > 0 && <button className={s.botao} onClick={limparFiltros}>Limpar filtros</button>}</div>
              )}
              <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
