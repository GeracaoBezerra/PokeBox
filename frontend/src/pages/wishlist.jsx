import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { getWishlistFilters, listWishlist, removeFromWishlist } from "../api/wishlist";
import AdicionarNaColecao from "../components/AdicionarNaColecao/AdicionarNaColecao";
import AdicionarWishlist from "../components/AdicionarWishlist/AdicionarWishlist";
import Aviso from "../components/Aviso/Aviso";
import ConfirmModal from "../components/ConfirmModal/ConfirmModal";
import FiltrosWishlist from "../components/FiltrosWishlist/FiltrosWishlist";
import GradeCartas, { ItemGrade } from "../components/GradeCartas/GradeCartas";
import ItemWishlist from "../components/ItemWishlist/ItemWishlist";
import Paginacao from "../components/Paginacao/Paginacao";
import SelosFiltro from "../components/SelosFiltro/SelosFiltro";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import { useConfirmacao } from "../hooks/useConfirmacao";
import s from "../styles/vitrine.module.css";
import { LIMITE_BUSCA } from "../utils/busca";
import {
  CAMPOS_FILTRO_WISHLIST,
  ORDENACOES_WISHLIST,
  POR_PAGINA,
  filtrosDaWishlist,
  rotuloDoSeloWishlist,
} from "../utils/wishlist";

const porNome = new Intl.Collator("pt-BR");
const VAZIOS = Object.fromEntries(CAMPOS_FILTRO_WISHLIST.map((campo) => [campo, ""]));

function podeAnimar(elemento) {
  return typeof elemento?.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function animarSaida(elemento) {
  if (!elemento?.isConnected || !podeAnimar(elemento)) return;
  const saida = elemento.animate(
    [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.96)" }],
    { duration: 180, easing: "ease-in", fill: "forwards" },
  );
  await saida.finished.catch(() => {});
}

export default function WishlistPage() {
  const [params, setParams] = useSearchParams();
  const { q, type, rarity, setId, sort, page, buscaCurta, buscaLonga, qApi } = filtrosDaWishlist(params);
  const filtrosApi = { q: qApi, type, rarity, setId, sort };
  const { dados, erro, carregando: buscando, recarregando, recarregar } = useCarregar(
    () => listWishlist({ ...filtrosApi, page, limit: POR_PAGINA, includeFilters: "false" }),
    JSON.stringify({ ...filtrosApi, page }),
    { descartarDadosAntigosEmErro: true },
  );
  const opcoes = useCarregar(getWishlistFilters);
  const [local, setLocal] = useState({ base: null, itens: null });
  const itens = dados ? (local.base === dados ? local.itens : dados.items) : null;
  const carregando = buscando && !(recarregando && itens);
  const [conseguiu, setConseguiu] = useState(null);
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const grade = useRef(null);
  const adicionar = useRef(null);

  const painel = { q, type, rarity, setId };
  const temFiltro = Boolean(qApi || type || rarity || setId);
  const temProxima = Boolean(dados?.pagination?.hasNextPage);
  const listaCompleta = page === 1 && !temProxima && !temFiltro;
  const filtrosDisponiveis = opcoes.dados;
  const nomeDoSet = filtrosDisponiveis?.sets?.find((set) => set.id === setId)?.name ?? setId;
  const selos = CAMPOS_FILTRO_WISHLIST.filter((campo) => painel[campo]).map((campo) => ({
    campo,
    rotulo: rotuloDoSeloWishlist(campo, campo === "setId" ? nomeDoSet : painel[campo]),
  }));
  const vazia = Boolean(itens) && itens.length === 0;
  const paginaVazia = vazia && page > 1;
  const semResultado = vazia && temFiltro && !paginaVazia;

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

  function atualizarGrade(atualizar) {
    const elemento = grade.current;
    const atualizarItens = () =>
      setLocal((atual) => ({ base: dados, itens: atualizar(atual.base === dados ? atual.itens : dados.items) }));
    if (!podeAnimar(elemento)) {
      atualizarItens();
      return;
    }

    const posicoes = new Map(Array.from(elemento.children, (item) => [item, item.getBoundingClientRect()]));
    for (const item of posicoes.keys()) item.getAnimations().forEach((animacao) => animacao.cancel());
    flushSync(atualizarItens);
    for (const item of elemento.children) {
      const anterior = posicoes.get(item);
      if (!anterior) {
        item.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], 240);
        continue;
      }
      const atual = item.getBoundingClientRect();
      const x = anterior.left - atual.left;
      const y = anterior.top - atual.top;
      if (x || y) item.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], { duration: 240, easing: "ease-out" });
    }
  }

  async function tirarDaGrade(item, elemento) {
    opcoes.recarregar();
    if (page > 1 && itens.every((atual) => atual.id === item.id)) {
      atualizar({ page: page - 1 }, false);
      return;
    }
    await animarSaida(elemento);
    const foco = document.activeElement;
    if (elemento?.contains(foco) || foco === document.body) adicionar.current?.focus();
    atualizarGrade((atuais) => atuais.filter((atual) => atual.id !== item.id));
    if (!listaCompleta) recarregar();
  }

  async function remover(item, elemento) {
    const confirmou = await pedir({
      titulo: `Remover ${item.card.name} da wishlist?`,
      textoConfirmar: "Remover carta",
      perigo: true,
    });
    if (!confirmou) return;

    await acao.executar(async () => {
      await removeFromWishlist(item.id);
      await tirarDaGrade(item, elemento);
    }, `${item.card.name} saiu da wishlist.`, { tipo: "aviso" });
  }

  async function adicionouNaColecao() {
    const { item, elemento } = conseguiu;
    flushSync(() => setConseguiu(null));
    await tirarDaGrade(item, elemento);
  }

  function adicionou(item) {
    opcoes.recarregar();
    if (temFiltro || sort || page > 1 || temProxima) {
      recarregar();
      return;
    }
    atualizarGrade((atuais) => [item, ...atuais.filter((atual) => atual.id !== item.id)]
      .sort((a, b) => porNome.compare(a.card.name, b.card.name))
      .slice(0, POR_PAGINA));
    if (itens.length >= POR_PAGINA) recarregar();
  }

  return (
    <div className={s.pagina}>
      <header className={s.cabecalho}>
        <span className={s.eyebrow}>Cartas que você procura</span>
        <h1>Wishlist</h1>
        <p>Salve as cartas que você quer e veja quantos colecionadores têm cada uma pública e disponível para troca.</p>
      </header>
      <div className={s.barra}>
        <label className={s.campo}>
          Ordenar por
          <select value={sort} onChange={(evento) => atualizar({ sort: evento.target.value })}>
            <option value="">{ORDENACOES_WISHLIST.name}</option>
            <option value="recent">{ORDENACOES_WISHLIST.recent}</option>
          </select>
        </label>
      </div>
      <div className={s.layout}>
        <FiltrosWishlist
          filtros={painel}
          filtrosDisponiveis={filtrosDisponiveis}
          carregando={opcoes.primeiraCarga}
          erro={opcoes.erro}
          onTentarDeNovo={opcoes.recarregar}
          onAlterar={(campo, valor) => atualizar({ [campo]: valor })}
          onLimpar={limparFiltros}
          onAplicar={atualizar}
        />
        <section className={s.resultados} aria-label="Cartas da wishlist">
          <div className={s.resumo}>
            <p>
              {qApi ? (
                <>
                  Resultados para <strong>“{qApi}”</strong>
                </>
              ) : (
                "Todas as cartas da wishlist"
              )}
            </p>
            <span>
              {buscando
                ? "Carregando a wishlist…"
                : itens
                  ? `${itens.length} ${itens.length === 1 ? "carta" : "cartas"} nesta página`
                  : ""}
            </span>
          </div>
          {buscaCurta && <p className={s.dica}>Digite pelo menos 2 letras ou números para buscar pelo nome.</p>}
          {buscaLonga && <p className={s.dica}>A busca aceita até {LIMITE_BUSCA} caracteres.</p>}
          <SelosFiltro selos={selos} onRemover={(campo) => atualizar({ [campo]: "" })} onLimpar={limparFiltros} />
          <Aviso erro={erro} onTentarDeNovo={recarregar} />
          <Aviso erro={acao.erro} />
          {carregando && <GradeCartas carregando total={POR_PAGINA + 1} variante="catalogo" />}

          {!carregando && semResultado && (
            <div className={s.vazio}>
              <SearchX size={32} aria-hidden="true" />
              <h2>Nenhuma carta da wishlist bate com esses filtros</h2>
              <p>Tente outro nome ou tire algum filtro.</p>
              <button type="button" className={s.botao} onClick={limparFiltros}>
                Limpar filtros
              </button>
            </div>
          )}

          {!carregando && paginaVazia && (
            <div className={s.vazio}>
              <SearchX size={32} aria-hidden="true" />
              <h2>Não há cartas nesta página</h2>
              <button type="button" className={s.botao} onClick={() => atualizar({ page: "" }, false)}>
                Voltar para a primeira página
              </button>
            </div>
          )}

          {!carregando && itens && !semResultado && !paginaVazia && (
            <>
              {vazia && <p className={s.dicaBusca}>Sua wishlist está vazia. Adicione uma carta para começar.</p>}
              <GradeCartas ref={grade} variante="catalogo">
                <ItemGrade>
                  <AdicionarWishlist botaoRef={adicionar} itens={itens} onAdicionou={adicionou} />
                </ItemGrade>
                {itens.map((item) => (
                  <ItemGrade key={item.id}>
                    <ItemWishlist
                      item={item}
                      ocupado={acao.ocupado}
                      onRemover={remover}
                      onJaConsegui={(alvo, elemento) => setConseguiu({ item: alvo, elemento })}
                    />
                  </ItemGrade>
                ))}
              </GradeCartas>
              {(page > 1 || temProxima) && (
                <Paginacao
                  pagina={page}
                  temProxima={temProxima}
                  carregando={buscando}
                  onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)}
                />
              )}
            </>
          )}
        </section>
      </div>
      <ConfirmModal
        aberto={Boolean(conseguiu)}
        titulo={conseguiu ? `Adicionar ${conseguiu.item.card.name} à coleção` : ""}
        mensagem="A carta entra na sua coleção e sai da wishlist."
        textoCancelar="Fechar"
        onCancelar={() => setConseguiu(null)}
      >
        {conseguiu && (
          <AdicionarNaColecao carta={conseguiu.item.card} onAdicionado={adicionouNaColecao} />
        )}
      </ConfirmModal>
    </div>
  );
}
