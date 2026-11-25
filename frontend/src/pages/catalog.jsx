import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { getCardFilters, searchCards } from "../api/cards";
import { mensagemAmigavel } from "../api/mensagens";
import { addToWishlist, removeFromWishlist } from "../api/wishlist";
import { removeCollectionItem, updateCollectionItem } from "../api/collection";
import { useSession } from "../auth/useSession";
import AcoesRapidas from "../components/AcoesRapidas/AcoesRapidas";
import AdicionarNaColecao from "../components/AdicionarNaColecao/AdicionarNaColecao";
import Atualizando from "../components/Atualizando/Atualizando";
import Aviso from "../components/Aviso/Aviso";
import ModalColecao from "../components/ModalColecao/ModalColecao";
import EditarItemColecao from "../components/EditarItemColecao/EditarItemColecao";
import estilosEdicao from "../components/EditarItemColecao/EditarItemColecao.module.css";
import FiltrosCatalogo from "../components/FiltrosCatalogo/FiltrosCatalogo";
import GradeCartas from "../components/GradeCartas/GradeCartas";
import Paginacao from "../components/Paginacao/Paginacao";
import SelosFiltro from "../components/SelosFiltro/SelosFiltro";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import { useMinhasCartas } from "../hooks/useMinhasCartas";
import { useToast } from "../hooks/useToast";
import { useConfirmacao } from "../hooks/useConfirmacao";
import { motivoDeNaoApagar } from "../utils/colecao";
import s from "../styles/vitrine.module.css";
import { IDIOMAS, IDIOMA_PADRAO, linkBuscaNaReserva } from "../utils/idioma";
import { CATEGORIAS, TIPOS, variante } from "../utils/rotulos";

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

function AcoesDaCarta({ carta, lang, logado, minhas, atualizando, onPrecisaLogin, onTenho, onEditar, onMudou }) {
  const toast = useToast();
  const { ocupado, executar } = useAcao();
  const itemWishlist = minhas?.naWishlist.get(carta.id);

  async function alternarWishlist() {
    if (!logado) {
      onPrecisaLogin();
      return;
    }
    const tirar = Boolean(itemWishlist);
    const { ok, erro } = await executar(
      () => (tirar ? removeFromWishlist(itemWishlist) : addToWishlist(carta.id, lang)),
      tirar ? `${carta.name} saiu da wishlist.` : `${carta.name} entrou na wishlist.`,
      { tipo: tirar ? "aviso" : "sucesso" }
    );
    if (ok) onMudou();
    else toast.erro(mensagemAmigavel(erro));
  }

  return (
    <AcoesRapidas
      nome={carta.name}
      visualCatalogo
      naWishlist={Boolean(itemWishlist)}
      tenho={Boolean(minhas?.tenho.has(carta.id))}
      ocupado={ocupado || atualizando}
      bloqueado={logado && !minhas}
      onQuero={alternarWishlist}
      onTenho={() => (logado ? onTenho(carta) : onPrecisaLogin())}
      onEditar={() => onEditar(carta)}
    />
  );
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
  const sortPedido = params.get("sort");
  const sort = ["name", "recent", "wanted", "traded"].includes(sortPedido) ? sortPedido : undefined;
  const ordemPedida = params.get("order");
  const order = ordemPedida === "asc" || ordemPedida === "desc"
    ? ordemPedida
    : sort && sort !== "name" ? "desc" : "asc";
  const ordenacao = sort === "name" ? `name-${order}` : sort ?? "relevance";
  const busca = useCarregar(
    async () => (esperandoOpcoes ? null : searchCards({ name, lang, page, limit: 24, ...filtros, sort, order })),
    esperandoOpcoes ? "esperando" : JSON.stringify({ name, lang, page, ...filtros, sort, order })
  );
  const { dados, erro, recarregar } = busca;
  const carregando = busca.carregando || esperandoOpcoes;
  const primeiraCarga = carregando && !dados;
  const infoBusca = carregando ? null : dados?.search ?? null;
  const setsReconhecidos = infoBusca?.sets ?? [];
  const palavrasIgnoradas = infoBusca?.ignored ?? [];
  const buscaParcial = Boolean(palavrasIgnoradas.length && (infoBusca?.name || setsReconhecidos.length) && dados?.items.length);
  const paginaVazia = Boolean(dados) && dados.items.length === 0;
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [acaoColecao, setAcaoColecao] = useState(null);
  const { pedir } = useConfirmacao();
  const { executar: executarRemocao, ocupado: removendo } = useAcao();
  const minhasCartas = useMinhasCartas(session);

  function pedirLogin() {
    navigate("/login", { state: { de: location.pathname + location.search } });
  }

  function acoesDaCarta(carta) {
    return (
      <AcoesDaCarta
        carta={carta}
        lang={lang}
        logado={Boolean(session)}
        minhas={minhasCartas.minhas}
        atualizando={Boolean(session) && minhasCartas.carregando}
        onPrecisaLogin={pedirLogin}
        onTenho={(c) => setAcaoColecao({ tipo: "adicionar", carta: c })}
        onEditar={(c) => setAcaoColecao({ tipo: "editar", carta: c })}
        onMudou={minhasCartas.recarregar}
      />
    );
  }

  function adicionouNaColecao() {
    setAcaoColecao(null);
    minhasCartas.recarregar();
  }

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
    if (valor === "relevance") return atualizar({ sort: "", order: "" });
    if (valor.startsWith("name-")) {
      return atualizar({ sort: "name", order: valor === "name-desc" ? "desc" : "asc" });
    }
    atualizar({ sort: valor, order: "desc" });
  }

  function limparFiltros() {
    atualizar(VAZIOS);
  }

  function resumoDaBusca() {
    if (!name) return "Todas as cartas";
    if (infoBusca && !infoBusca.name && setsReconhecidos.length) {
      return `Cartas de ${setsReconhecidos.join(", ")}`;
    }
    if (infoBusca?.name && setsReconhecidos.length && !palavrasIgnoradas.length) {
      return (
        <>
          Resultados para <strong>“{infoBusca.name}”</strong> em {setsReconhecidos.join(", ")}
        </>
      );
    }
    return (
      <>
        Resultados para <strong>“{name}”</strong>
      </>
    );
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
            <option value="recent">Mais recentes</option>
            <option value="traded">Mais trocadas</option>
            <option value="wanted">Mais desejadas</option>
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
              {resumoDaBusca()}
            </p>
            <span>{carregando ? "Buscando cartas…" : dados ? `${dados.items.length} cartas nesta página` : ""}</span>
          </div>
          <div role="status">
            {buscaParcial && (
              <p className={s.dicaBusca}>
                Não achamos tudo que você digitou ({palavrasIgnoradas.join(", ")}).{" "}
                {infoBusca.name ? (
                  <>
                    Mostrando resultados para <strong>“{infoBusca.name}”</strong>
                    {setsReconhecidos.length > 0 && ` em ${setsReconhecidos.join(", ")}`}.
                  </>
                ) : (
                  `Mostrando as cartas de ${setsReconhecidos.join(", ")}.`
                )}
              </p>
            )}
          </div>
          <SelosFiltro selos={selos} onRemover={(campo) => atualizar({ [campo]: "" })} onLimpar={limparFiltros} />
          <Aviso erro={erro} onTentarDeNovo={recarregar} />
          {!carregando && dados && (
            <Aviso
              erro={minhasCartas.erro}
              texto={
                minhasCartas.minhas
                  ? "Não conseguimos atualizar sua wishlist e sua coleção. Os botões Quero e Tenho mostram o que sabíamos antes."
                  : "Não conseguimos carregar sua wishlist e sua coleção, então os botões Quero e Tenho ficam desligados por enquanto."
              }
              onTentarDeNovo={minhasCartas.recarregar}
            />
          )}
          {primeiraCarga && <GradeCartas carregando total={24} variante="catalogo" />}
          {!primeiraCarga && dados && (
            <Atualizando atualizando={carregando}>
              {dados.items.length ? (
                <GradeCartas cartas={dados.items} lang={lang} variante="catalogo" acoes={acoesDaCarta} />
              ) : (
                <div className={s.vazio}>
                  <SearchX size={32} aria-hidden="true" />
                  <h2>{name ? `Nenhuma carta encontrada para “${name}”` : "Nenhuma carta encontrada"}</h2>
                  <p>Tente outro nome ou ajuste os filtros para ampliar a busca.</p>
                  {atalhoIngles}
                  <div className={s.acoesVazio}>
                    {name && (
                      <button type="button" className={s.botao} onClick={() => atualizar({ name: "" })}>
                        Limpar busca
                      </button>
                    )}
                    {selos.length > 0 && (
                      <button type="button" className={s.botao} onClick={limparFiltros}>
                        Limpar filtros
                      </button>
                    )}
                    {paginaVazia && page > 1 && (
                      <button type="button" className={s.botao} onClick={() => atualizar({ page: "" }, false)}>
                        Voltar para a primeira página
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!paginaVazia && (
                <Paginacao
                  pagina={page}
                  temProxima={dados.pagination?.hasNextPage}
                  onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)}
                />
              )}
              {dados.items.length > 0 && atalhoIngles}
            </Atualizando>
          )}
        </section>
      </div>
      <ModalColecao aberto={Boolean(acaoColecao)} titulo={acaoColecao ? `${acaoColecao.tipo === "editar" ? "Editar" : "Adicionar"} ${acaoColecao.carta.name} à coleção` : "Coleção"} larga onFechar={() => setAcaoColecao(null)}>
        {acaoColecao?.tipo === "adicionar" && <AdicionarNaColecao carta={acaoColecao.carta} lang={lang} onAdicionado={adicionouNaColecao} />}
        {acaoColecao?.tipo === "editar" && (() => {
          const cartaEditando = acaoColecao.carta;
          const versoes = minhasCartas.minhas?.versoes.get(cartaEditando.id) ?? [];
          async function remover(item) {
            const comHistorico = item.deleteBlockedBy === "LISTING_HISTORY";
            const motivo = motivoDeNaoApagar(item.deleteBlockedBy);
            if (motivo && !comHistorico) return;
            const confirmou = await pedir({ titulo: comHistorico ? "Tirar carta da coleção?" : "Remover carta da coleção?", mensagem: comHistorico ? `${cartaEditando.name} ficará com quantidade zero e sairá do seu perfil público. O histórico de anúncios será mantido.` : `${cartaEditando.name} será removida da sua coleção.`, textoConfirmar: comHistorico ? "Tirar da coleção" : "Remover", perigo: true });
            if (!confirmou) return;
            const { ok } = await executarRemocao(
              () => comHistorico ? updateCollectionItem(item.id, { quantity: 0 }) : removeCollectionItem(item.id),
              comHistorico ? `${cartaEditando.name} saiu da coleção.` : `${cartaEditando.name} removida da coleção.`
            );
            if (ok) { setAcaoColecao(null); minhasCartas.recarregar(); }
          }
          function adicionarOutraVersao() {
            setAcaoColecao({ tipo: "adicionar", carta: cartaEditando });
          }
          return <>
            <div className={estilosEdicao.listaVersoes}>
              {versoes.map((item) => (
                <section className={estilosEdicao.versao} key={item.id} aria-label={`Versão ${variante(item)}`}>
                  {versoes.length > 1 && <h3>{variante(item)} · {item.condition}</h3>}
                  <EditarItemColecao item={item} onSalvo={() => { setAcaoColecao(null); minhasCartas.recarregar(); }} onRemover={() => remover(item)} ocupadoExtra={removendo || Boolean(motivoDeNaoApagar(item.deleteBlockedBy) && item.deleteBlockedBy !== "LISTING_HISTORY")} />
                </section>
              ))}
            </div>
            <div className={estilosEdicao.acoes}><button className={estilosEdicao.acaoSecundaria} type="button" onClick={adicionarOutraVersao} disabled={removendo}>Adicionar outra versão</button></div>
          </>;
        })()}
      </ModalColecao>
    </div>
  );
}
