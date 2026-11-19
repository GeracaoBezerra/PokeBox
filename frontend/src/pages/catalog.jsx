import { Link, useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { getCardFilters, searchCards } from "../api/cards";
import Aviso from "../components/Aviso/Aviso";
import FiltrosCatalogo from "../components/FiltrosCatalogo/FiltrosCatalogo";
import GradeCartas from "../components/GradeCartas/GradeCartas";
import Paginacao from "../components/Paginacao/Paginacao";
import SelosFiltro from "../components/SelosFiltro/SelosFiltro";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/vitrine.module.css";
import { IDIOMAS, IDIOMA_PADRAO, linkBuscaNaReserva } from "../utils/idioma";
import { CATEGORIAS, TIPOS } from "../utils/rotulos";

const CAMPOS_FILTRO = ["category", "type", "rarity", "set"];
const VAZIOS = Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ""]));

function valorAceito(valor, aceitos = []) {
  return aceitos.find((opcao) => opcao.toLowerCase() === valor.toLowerCase()) ?? "";
}

function filtrosValidos(filtros, opcoes) {
  const aceitos = {
    category: opcoes.categories,
    type: opcoes.types,
    rarity: opcoes.rarities,
    set: opcoes.sets?.map((set) => set.id),
  };
  return Object.fromEntries(
    CAMPOS_FILTRO.map((campo) => [campo, filtros[campo] ? valorAceito(filtros[campo], aceitos[campo]) : ""])
  );
}

function rotuloDoSelo(campo, valor, opcoes) {
  switch (campo) {
    case "category":
      return `Categoria: ${CATEGORIAS[valor] ?? valor}`;
    case "type":
      return `Tipo: ${TIPOS[valor] ?? valor}`;
    case "rarity":
      return `Raridade: ${valor}`;
    case "set":
      return `Expansão: ${opcoes?.sets.find((set) => set.id === valor)?.name ?? valor}`;
    default:
      return valor;
  }
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const name = params.get("name") ?? "";
  const lang = params.get("lang") ?? IDIOMA_PADRAO;
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const filtrosPedidos = Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, params.get(campo) ?? ""]));
  const opcoes = useCarregar(() => getCardFilters(lang), lang);
  const esperandoOpcoes = Object.values(filtrosPedidos).some(Boolean) && opcoes.carregando;
  const filtros = opcoes.dados ? filtrosValidos(filtrosPedidos, opcoes.dados) : filtrosPedidos;
  const sort = params.get("sort") === "name" ? "name" : undefined;
  const order = params.get("order") === "desc" ? "desc" : "asc";
  const ordenacao = sort ? `name-${order}` : "relevance";
  const busca = useCarregar(
    async () => (esperandoOpcoes ? null : searchCards({ name, lang, page, limit: 24, ...filtros, sort, order })),
    esperandoOpcoes ? "esperando" : JSON.stringify({ name, lang, page, ...filtros, sort, order })
  );
  const { dados, erro, recarregar } = busca;
  const carregando = busca.carregando || esperandoOpcoes;

  function atualizar(mudancas, reiniciarPagina = true) {
    const novos = new URLSearchParams(params);
    for (const [campo, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(campo, String(valor));
      else novos.delete(campo);
    }
    if (reiniciarPagina) novos.delete("page");
    setParams(novos);
  }

  function trocarIdioma(idioma) {
    atualizar({ ...VAZIOS, lang: idioma });
  }

  function ordenar(valor) {
    atualizar({ sort: valor === "relevance" ? "" : "name", order: valor === "name-desc" ? "desc" : "" });
  }

  function limparFiltros() {
    atualizar(VAZIOS);
  }

  const atalhoIngles = lang === IDIOMA_PADRAO && name ? (
    <p className={s.reserva}>
      Não achou? As coleções antigas só existem em inglês. <Link to={linkBuscaNaReserva(name)}>Procurar em inglês</Link>
    </p>
  ) : null;

  const selos = CAMPOS_FILTRO.filter((campo) => filtros[campo]).map((campo) => ({
    campo,
    rotulo: rotuloDoSelo(campo, filtros[campo], opcoes.dados),
  }));

  return (
    <div className={s.pagina}>
      <header className={s.cabecalho}>
        <span className={s.eyebrow}>Explore o universo Pokémon TCG</span>
        <h1>Catálogo de cartas</h1>
        <p>Encontre sua próxima carta, complete sua coleção e descubra novas possibilidades de troca.</p>
      </header>
      <div className={s.barra}>
        <label className={s.campo}>
          Idioma
          <select value={lang} onChange={(e) => trocarIdioma(e.target.value)}>
            {Object.entries(IDIOMAS).map(([codigo, nome]) => (
              <option key={codigo} value={codigo}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className={s.campo}>
          Ordenar por
          <select value={ordenacao} onChange={(e) => ordenar(e.target.value)}>
            <option value="relevance">Relevância</option>
            <option value="name-asc">Nome: A–Z</option>
            <option value="name-desc">Nome: Z–A</option>
            <option value="rarity" disabled>
              Raridade — em breve
            </option>
            <option value="recent" disabled>
              Mais recentes — em breve
            </option>
            <option value="wanted" disabled>
              Mais desejadas — em breve
            </option>
          </select>
        </label>
      </div>
      <div className={s.layout}>
        <FiltrosCatalogo
          opcoes={opcoes}
          filtros={filtros}
          onAlterar={(campo, valor) => atualizar({ [campo]: valor })}
          onLimpar={limparFiltros}
          onAplicar={atualizar}
        />
        <section className={s.resultados} aria-label="Resultados do catálogo">
          <div className={s.resumo} role="status">
            <p>
              {name ? (
                <>
                  Resultados para <strong>“{name}”</strong>
                </>
              ) : (
                "Todas as cartas"
              )}
            </p>
            <span>{carregando ? "Buscando cartas…" : dados ? `${dados.items.length} cartas nesta página` : ""}</span>
          </div>
          <SelosFiltro selos={selos} onRemover={(campo) => atualizar({ [campo]: "" })} onLimpar={limparFiltros} />
          <Aviso erro={erro} onTentarDeNovo={recarregar} />
          {carregando && <GradeCartas carregando total={24} variante="catalogo" />}
          {!carregando && dados && (
            <>
              {dados.items.length ? (
                <GradeCartas cartas={dados.items} lang={lang} variante="catalogo" />
              ) : (
                <div className={s.vazio}>
                  <SearchX size={32} aria-hidden="true" />
                  <h2>Nenhuma carta encontrada</h2>
                  <p>Tente outro nome ou ajuste os filtros para ampliar a busca.</p>
                  {atalhoIngles}
                  {selos.length > 0 && (
                    <button type="button" className={s.botao} onClick={limparFiltros}>
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
              <Paginacao
                pagina={page}
                temProxima={dados.pagination?.hasNextPage}
                onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)}
              />
              {dados.items.length > 0 && atalhoIngles}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
