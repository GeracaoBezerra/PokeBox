import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { getCardFilters } from "../api/cards";
import { listListings } from "../api/listings";
import { listWishlist } from "../api/wishlist";
import { useSession } from "../auth/useSession";
import Aviso from "../components/Aviso/Aviso";
import BarraBusca from "../components/BarraBusca/BarraBusca";
import CartaAnuncio from "../components/CartaAnuncio/CartaAnuncio";
import FiltrosMarketplace from "../components/FiltrosMarketplace/FiltrosMarketplace";
import GradeCartas, { ItemGrade } from "../components/GradeCartas/GradeCartas";
import Paginacao from "../components/Paginacao/Paginacao";
import SelosFiltro from "../components/SelosFiltro/SelosFiltro";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/vitrine.module.css";
import { temPalavra, usernameValido } from "../utils/filtrosMarketplace";
import { ACABAMENTOS, CONDICOES, ORDENACOES, TIPOS } from "../utils/rotulos";

const CAMPOS_FILTRO = ["cardId", "username", "condition", "finish", "firstEdition", "type", "rarity", "wishlist"];
const CAMPOS_PAINEL = ["username", "condition", "finish", "firstEdition", "type", "rarity", "wishlist"];
const VAZIOS = Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ""]));

const VALIDOS = { condition: CONDICOES, finish: ACABAMENTOS, firstEdition: { true: "", false: "" }, type: TIPOS };

function valorValido(campo, valor) {
  if (campo === "username") return usernameValido(valor);
  return !VALIDOS[campo] || Object.hasOwn(VALIDOS[campo], valor);
}

function semVazios(filtros) {
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
}

function rotuloDoSelo(campo, valor, nomeDaCarta) {
  switch (campo) {
    case "cardId":
      return nomeDaCarta ? `Carta: ${nomeDaCarta} (${valor})` : `Carta: ${valor}`;
    case "username":
      return `@${valor}`;
    case "condition":
      return `Condição: ${CONDICOES[valor] ?? valor}`;
    case "finish":
      return `Acabamento: ${ACABAMENTOS[valor] ?? valor}`;
    case "firstEdition":
      return valor === "true" ? "Só 1ª edição" : "Sem 1ª edição";
    case "type":
      return `Tipo: ${TIPOS[valor] ?? valor}`;
    case "rarity":
      return `Raridade: ${valor}`;
    case "wishlist":
      return "Só da minha wishlist";
    default:
      return valor;
  }
}

export default function MarketplacePage() {
  const [params, setParams] = useSearchParams();
  const sessao = useSession();
  const meuUsername = sessao?.user?.username;
  const [wishlist, setWishlist] = useState(null);
  const [raridades, setRaridades] = useState([]);

  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const filtros = Object.fromEntries(
    CAMPOS_FILTRO.map((campo) => {
      const valor = params.get(campo) ?? "";
      return [campo, valorValido(campo, valor) ? valor : ""];
    })
  );
  const buscaCurta = q !== "" && !temPalavra(q);
  const filtrosApi = semVazios({
    ...filtros,
    wishlist: "",
    q: buscaCurta ? "" : q,
    sort,
  });
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => listListings({ ...filtrosApi, page, limit: 24 }),
    JSON.stringify({ ...filtrosApi, page })
  );

  useEffect(() => {
    let ativo = true;
    getCardFilters("en")
      .then((opcoes) => ativo && setRaridades(opcoes.rarities ?? []))
      .catch(() => ativo && setRaridades([]));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!sessao) return undefined;
    let ativo = true;
    listWishlist()
      .then((itens) => ativo && setWishlist(new Set(itens.map((item) => item.cardId))))
      .catch(() => ativo && setWishlist(null));
    return () => {
      ativo = false;
    };
  }, [sessao]);

  function atualizar(mudancas, reiniciarPagina = true) {
    const novos = new URLSearchParams(params);
    for (const [campo, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(campo, String(valor));
      else novos.delete(campo);
    }
    if (reiniciarPagina) novos.delete("page");
    setParams(novos);
  }

  function limparFiltros() {
    atualizar(VAZIOS);
  }

  const idsWishlist = sessao ? wishlist : null;
  const soWishlist = filtros.wishlist === "1" && Boolean(idsWishlist);
  const nomeDaCarta = dados?.items.find((anuncio) => anuncio.card.id === filtros.cardId)?.card.name;
  const selos = CAMPOS_FILTRO.filter((campo) => filtros[campo] && (campo !== "wishlist" || sessao)).map((campo) => ({
    campo,
    rotulo: rotuloDoSelo(campo, filtros[campo], nomeDaCarta),
  }));
  const anuncios = (dados?.items ?? []).filter((anuncio) => !soWishlist || idsWishlist.has(anuncio.card.id));
  const painel = Object.fromEntries(CAMPOS_PAINEL.map((campo) => [campo, filtros[campo]]));

  return (
    <div className={s.pagina}>
      <header className={s.cabecalho}>
        <span className={s.eyebrow}>Trocas entre colecionadores</span>
        <h1>Marketplace</h1>
        <p>Encontre quem tem a carta que você procura e proponha uma troca.</p>
      </header>
      <div className={s.barra}>
        <BarraBusca
          rotulo="Buscar carta"
          placeholder="ex.: charizard, ultra ball, charizard base"
          valor={q}
          onBuscar={(texto) => atualizar({ q: texto })}
        />
        <label className={s.campo}>
          Ordenar por
          <select value={sort} onChange={(e) => atualizar({ sort: e.target.value })}>
            <option value="">{ORDENACOES.recent}</option>
            <option value="oldest">{ORDENACOES.oldest}</option>
            <option value="name">{ORDENACOES.name}</option>
          </select>
        </label>
      </div>
      <div className={s.layout}>
        <FiltrosMarketplace
          filtros={painel}
          raridades={raridades}
          logado={Boolean(sessao)}
          onAlterar={(campo, valor) => atualizar({ [campo]: valor })}
          onLimpar={limparFiltros}
          onAplicar={atualizar}
        />
        <section className={s.resultados} aria-label="Anúncios do marketplace">
          <div className={s.resumo} role="status">
            <p>
              {q && !buscaCurta ? (
                <>
                  Resultados para <strong>“{q}”</strong>
                </>
              ) : (
                "Todos os anúncios"
              )}
            </p>
            <span>
              {carregando
                ? "Buscando anúncios…"
                : dados
                  ? `${anuncios.length} ${anuncios.length === 1 ? "anúncio" : "anúncios"} nesta página`
                  : ""}
            </span>
          </div>
          {buscaCurta && <p className={s.dica}>Digite pelo menos 2 letras ou números para buscar pelo nome.</p>}
          <SelosFiltro selos={selos} onRemover={(campo) => atualizar({ [campo]: "" })} onLimpar={limparFiltros} />
          <Aviso erro={erro} onTentarDeNovo={recarregar} />
          {carregando && <GradeCartas carregando total={24} variante="catalogo" />}
          {!carregando && dados && (
            <>
              {anuncios.length ? (
                <GradeCartas variante="catalogo">
                  {anuncios.map((anuncio) => (
                    <ItemGrade key={anuncio.id}>
                      <CartaAnuncio
                        anuncio={anuncio}
                        naWishlist={Boolean(idsWishlist?.has(anuncio.card.id))}
                        seuAnuncio={anuncio.owner.username === meuUsername}
                      />
                    </ItemGrade>
                  ))}
                </GradeCartas>
              ) : (
                <div className={s.vazio}>
                  <SearchX size={32} aria-hidden="true" />
                  <h2>Nenhum anúncio encontrado</h2>
                  <p>
                    {soWishlist && dados.items.length > 0
                      ? "Nenhuma carta da sua wishlist nesta página. Tente a próxima."
                      : "Tente outro nome ou ajuste os filtros para ampliar a busca."}
                  </p>
                  {selos.length > 0 && (
                    <button type="button" className={s.botao} onClick={limparFiltros}>
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
              {(dados.items.length > 0 || page > 1) && (
                <Paginacao
                  pagina={page}
                  temProxima={dados.pagination?.hasNextPage}
                  onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
