import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCardFilters } from "../api/cards";
import { listListings } from "../api/listings";
import { listWishlist } from "../api/wishlist";
import { useSession } from "../auth/useSession";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CampoBusca from "../components/CampoBusca/CampoBusca";
import CartaAnuncio from "../components/CartaAnuncio/CartaAnuncio";
import FiltrosMarketplace from "../components/FiltrosMarketplace/FiltrosMarketplace";
import Paginacao from "../components/Paginacao/Paginacao";
import SelosFiltro from "../components/SelosFiltro/SelosFiltro";
import { useCarregar } from "../hooks/useCarregar";
import m from "../styles/marketplace.module.css";
import s from "../styles/paginas.module.css";
import { temPalavra, usernameValido } from "../utils/filtrosMarketplace";
import { ACABAMENTOS, CONDICOES, ORDENACOES, TIPOS } from "../utils/rotulos";

const CAMPOS_API = ["q", "cardId", "username", "condition", "finish", "firstEdition", "type", "rarity", "sort"];
const CAMPOS = [...CAMPOS_API, "wishlist"];

function semVazios(filtros) {
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
}

function rotuloDoSelo(campo, valor, nomeDaCarta) {
  switch (campo) {
    case "q":
      return `Busca: ${valor}`;
    case "cardId":
      return nomeDaCarta ? `Filtrando por ${nomeDaCarta} (${valor})` : `Filtrando por ${valor}`;
    case "username":
      return `@${valor}`;
    case "condition":
      return CONDICOES[valor] ?? valor;
    case "finish":
      return ACABAMENTOS[valor] ?? valor;
    case "firstEdition":
      return valor === "true" ? "Só 1ª edição" : "Sem 1ª edição";
    case "type":
      return `Tipo: ${TIPOS[valor] ?? valor}`;
    case "sort":
      return `Ordem: ${ORDENACOES[valor] ?? valor}`;
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

  const filtros = Object.fromEntries(CAMPOS.map((campo) => [campo, params.get(campo) ?? ""]));
  const page = Number(params.get("page") ?? 1);
  const filtrosApi = semVazios({
    ...Object.fromEntries(CAMPOS_API.map((campo) => [campo, filtros[campo]])),
    q: temPalavra(filtros.q) ? filtros.q : "",
    username: usernameValido(filtros.username) ? filtros.username : "",
  });
  const chave = JSON.stringify({ ...filtrosApi, page });

  const { dados, erro, recarregar } = useCarregar(
    () =>
      listListings({ ...filtrosApi, page, limit: 24 }).then(
        (resultado) => ({ ...resultado, chave }),
        (falha) => {
          falha.chave = chave;
          throw falha;
        }
      ),
    chave
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

  const idsWishlist = sessao ? wishlist : null;
  const textoParams = params.toString();

  const mudar = useCallback(
    (mudancas) => {
      const atuais = Object.fromEntries(new URLSearchParams(textoParams));
      delete atuais.page;
      setParams(semVazios({ ...atuais, ...mudancas }));
    },
    [textoParams, setParams]
  );

  const buscarPorNome = useCallback((texto) => mudar({ q: temPalavra(texto) ? texto : "" }), [mudar]);

  function limpar() {
    setParams({});
  }

  function irPara(novaPagina) {
    setParams(semVazios({ ...filtros, page: String(novaPagina) }));
  }

  const erroAtual = erro?.chave === chave ? erro : null;
  const carregando = !erroAtual && (!dados || dados.chave !== chave);
  const soWishlist = filtros.wishlist === "1" && Boolean(idsWishlist);
  const nomeDaCarta = dados?.items.find((anuncio) => anuncio.card.id === filtros.cardId)?.card.name;
  const selos = CAMPOS.filter((campo) => filtros[campo] && (campo !== "wishlist" || sessao)).map((campo) => ({
    campo,
    rotulo: rotuloDoSelo(campo, filtros[campo], nomeDaCarta),
  }));
  const anuncios = (dados?.items ?? []).filter(
    (anuncio) => !soWishlist || idsWishlist.has(anuncio.card.id)
  );

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Marketplace">Encontre quem tem a carta que você procura e proponha uma troca.</CabecalhoPagina>

      <div className={m.busca}>
        <CampoBusca
          rotulo="Buscar carta"
          valor={filtros.q}
          placeholder="ex.: charizard, ultra ball, charizard base"
          onMudar={buscarPorNome}
        />
      </div>

      <div className={m.layout}>
        <FiltrosMarketplace filtros={filtros} raridades={raridades} logado={Boolean(sessao)} onMudar={mudar} />

        <section aria-busy={carregando}>
          <SelosFiltro selos={selos} onRemover={(campo) => mudar({ [campo]: "" })} onLimpar={limpar} />
          <Aviso erro={erroAtual} onTentarDeNovo={recarregar} />
          {carregando && !dados && <p className={s.suave}>Carregando...</p>}

          {dados && (
            <div className={carregando ? m.atualizando : undefined}>
              {anuncios.length === 0 ? (
                <div className={m.vazio}>
                  <p className={s.suave}>
                    {soWishlist && dados.items.length > 0
                      ? "Nenhuma carta da sua wishlist nesta página."
                      : filtros.q
                        ? `Nenhum anúncio encontrado para "${filtros.q}".`
                        : "Nenhum anúncio encontrado."}
                  </p>
                  {selos.length > 0 && (
                    <button type="button" className={s.botaoSecundario} onClick={limpar}>
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className={s.grade}>
                  {anuncios.map((anuncio) => (
                    <CartaAnuncio
                      key={anuncio.id}
                      anuncio={anuncio}
                      naWishlist={Boolean(idsWishlist?.has(anuncio.card.id))}
                      seuAnuncio={anuncio.owner.username === meuUsername}
                    />
                  ))}
                </div>
              )}
              {(dados.items.length > 0 || page > 1) && (
                <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={irPara} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
