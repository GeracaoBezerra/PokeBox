import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Plus, SearchX } from "lucide-react";
import { getCollectionSummary, listCollection, removeCollectionItem, updateCollectionItem } from "../api/collection";
import { createListing } from "../api/listings";
import { errosPorCampo } from "../api/mensagens";
import { useSession } from "../auth/useSession";
import AdicionarCartaColecao from "../components/AdicionarCartaColecao/AdicionarCartaColecao";
import Atualizando from "../components/Atualizando/Atualizando";
import Aviso from "../components/Aviso/Aviso";
import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import CartaoAdicionar from "../components/CartaoAdicionar/CartaoAdicionar";
import CartaColecao from "../components/CartaColecao/CartaColecao";
import EditarItemColecao from "../components/EditarItemColecao/EditarItemColecao";
import FiltrosColecao from "../components/FiltrosColecao/FiltrosColecao";
import FormNovoAnuncio from "../components/FormNovoAnuncio/FormNovoAnuncio";
import GradeCartas, { ItemGrade } from "../components/GradeCartas/GradeCartas";
import ModalColecao from "../components/ModalColecao/ModalColecao";
import Paginacao from "../components/Paginacao/Paginacao";
import SelosFiltro from "../components/SelosFiltro/SelosFiltro";
import TabelaColecao from "../components/TabelaColecao/TabelaColecao";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import { useConfirmacao } from "../hooks/useConfirmacao";
import s from "../styles/vitrine.module.css";
import { LIMITE_BUSCA } from "../utils/busca";
import {
  CAMPOS_FILTRO_COLECAO,
  ORDENACOES_COLECAO,
  POR_PAGINA,
  chaveDoItem,
  filtrosDaApi,
  filtrosDaColecao,
  rotuloDoSeloColecao,
  textoTotais,
} from "../utils/colecao";
import { variante } from "../utils/rotulos";
import c from "./myCollection.module.css";

const VAZIOS = Object.fromEntries(CAMPOS_FILTRO_COLECAO.map((campo) => [campo, ""]));

function AnunciarItem({ item, onCriado }) {
  const { erro, ocupado, executar } = useAcao();

  async function anunciar(dados) {
    const { ok } = await executar(
      () => createListing({ collectionItemId: item.id, ...dados }),
      "Anúncio criado. Veja em Meus anúncios.",
    );
    if (ok) onCriado();
  }

  return (
    <div className={c.anuncio}>
      <p className={c.suave}>
        <strong>{item.card.name}</strong> · {variante(item)} · {item.available}{" "}
        {item.available === 1 ? "disponível" : "disponíveis"}
      </p>
      <FormNovoAnuncio disponivel={item.available} ocupado={ocupado} onCriar={anunciar} erros={errosPorCampo(erro?.details)} />
      <Aviso erro={erro} campos={["quantity", "description"]} />
    </div>
  );
}

export default function MyCollectionPage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const filtros = filtrosDaColecao(params);
  const { q, type, condition, finish, isPublic, zerados, sort, visao, page, buscaCurta, buscaLonga, qApi } = filtros;
  const filtrosApi = filtrosDaApi(filtros);
  const lista = useCarregar(
    () => listCollection({ ...filtrosApi, page, limit: POR_PAGINA }),
    JSON.stringify({ ...filtrosApi, page }),
  );
  const resumo = useCarregar(getCollectionSummary);
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const [adicionando, setAdicionando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [anunciando, setAnunciando] = useState(null);

  const itens = lista.dados?.items ?? null;
  const painel = { q, type, condition, finish, isPublic, zerados };
  const selos = CAMPOS_FILTRO_COLECAO.filter((campo) => painel[campo]).map((campo) => ({
    campo,
    rotulo: rotuloDoSeloColecao(campo, painel[campo]),
  }));
  const temFiltro = Boolean(qApi || type || condition || finish || isPublic);
  const temProxima = Boolean(lista.dados?.pagination?.hasNextPage);
  const vazia = Boolean(itens) && itens.length === 0;
  const paginaVazia = vazia && page > 1;
  const semResultado = vazia && temFiltro && !paginaVazia;
  const colecaoVazia = vazia && !temFiltro && !paginaVazia;

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

  function mudou() {
    lista.recarregar();
    resumo.recarregar();
  }

  function saiuItem() {
    resumo.recarregar();
    if (page > 1 && itens?.length === 1) atualizar({ page: page - 1 }, false);
    else lista.recarregar();
  }

  function adicionou() {
    setAdicionando(false);
    mudou();
  }

  async function apagar(item) {
    const confirmou = await pedir({
      titulo: "Apagar carta da coleção?",
      mensagem: `${item.card.name} sai da sua coleção. Não dá para desfazer.`,
      textoConfirmar: "Apagar",
      perigo: true,
    });
    if (!confirmou) return;
    const { ok } = await acao.executar(() => removeCollectionItem(item.id), `${item.card.name} saiu da sua coleção.`);
    if (ok) saiuItem();
  }

  async function tirar(item) {
    const confirmou = await pedir({
      titulo: `Tirar ${item.card.name} da coleção?`,
      mensagem:
        "A quantidade vai para 0 e a carta some do seu perfil público. Como ela já foi anunciada, o item fica guardado no histórico dos anúncios; para ter a carta de novo, é só adicioná-la outra vez.",
      textoConfirmar: "Tirar da coleção",
      perigo: true,
    });
    if (!confirmou) return;
    const { ok } = await acao.executar(
      () => updateCollectionItem(item.id, { quantity: 0 }),
      `${item.card.name} saiu da sua coleção.`,
    );
    if (!ok) return;
    if (zerados) mudou();
    else saiuItem();
  }

  const acoes = { ocupado: acao.ocupado, onAnunciar: setAnunciando, onApagar: apagar, onTirar: tirar };

  return (
    <div className={s.pagina}>
      <header className={`${s.cabecalho} ${c.cabecalho}`}>
        <div className={c.textos}>
          <span className={s.eyebrow}>Suas cartas</span>
          <h1>Minha coleção</h1>
          <p className={c.totais} aria-live="polite">
            {resumo.dados ? textoTotais(resumo.dados) : resumo.erro ? "" : "Contando suas cartas…"}
          </p>
          <p>
            Disponível = quantidade − reservada (reservada é o que está numa troca em andamento). Seu perfil público:{" "}
            <Link className={c.link} to={`/u/${session?.user?.username}`}>
              /u/{session?.user?.username}
            </Link>
          </p>
        </div>
      </header>
      <div className={s.barra}>
        <label className={s.campo}>
          Ordenar por
          <select value={sort} onChange={(evento) => atualizar({ sort: evento.target.value })}>
            <option value="">{ORDENACOES_COLECAO.name}</option>
            <option value="recent">{ORDENACOES_COLECAO.recent}</option>
          </select>
        </label>
        {visao === "lista" && (
          <button type="button" className={`${s.botao} ${c.adicionar}`} onClick={() => setAdicionando(true)}>
            <Plus size={18} aria-hidden="true" /> Adicionar carta
          </button>
        )}
        <div className={c.visao} role="group" aria-label="Visão da coleção">
          <button
            type="button"
            aria-pressed={visao === "grade"}
            onClick={() => atualizar({ visao: "" }, false)}
          >
            <LayoutGrid size={18} aria-hidden="true" /> Grade
          </button>
          <button
            type="button"
            aria-pressed={visao === "lista"}
            onClick={() => atualizar({ visao: "lista" }, false)}
          >
            <List size={18} aria-hidden="true" /> Lista
          </button>
        </div>
      </div>
      <div className={s.layout}>
        <FiltrosColecao
          filtros={painel}
          onAlterar={(campo, valor) => atualizar({ [campo]: valor })}
          onLimpar={limparFiltros}
          onAplicar={atualizar}
        />
        <section className={s.resultados} aria-label="Cartas da coleção">
          <div className={s.resumo}>
            <p>
              {qApi ? (
                <>
                  Resultados para <strong>“{qApi}”</strong>
                </>
              ) : (
                "Todas as cartas da coleção"
              )}
            </p>
            <span>
              {lista.carregando
                ? "Carregando a coleção…"
                : itens
                  ? `${itens.length} ${itens.length === 1 ? "item" : "itens"} nesta página`
                  : ""}
            </span>
          </div>
          {buscaCurta && <p className={s.dica}>Digite pelo menos 2 letras ou números para buscar pelo nome.</p>}
          {buscaLonga && <p className={s.dica}>A busca aceita até {LIMITE_BUSCA} caracteres.</p>}
          <SelosFiltro selos={selos} onRemover={(campo) => atualizar({ [campo]: "" })} onLimpar={limparFiltros} />
          <Aviso erro={lista.erro} onTentarDeNovo={lista.recarregar} />
          <Aviso erro={resumo.erro} onTentarDeNovo={resumo.recarregar} />
          <Aviso erro={acao.erro} />

          {lista.primeiraCarga &&
            (visao === "lista" ? (
              <CarregandoCartas formato="tabela" total={6} />
            ) : (
              <GradeCartas carregando total={6} variante="catalogo" />
            ))}

          {!lista.primeiraCarga && semResultado && (
            <div className={s.vazio}>
              <SearchX size={32} aria-hidden="true" />
              <h2>Nenhuma carta da coleção bate com esses filtros</h2>
              <p>Tente outro nome ou tire algum filtro.</p>
              <button type="button" className={s.botao} onClick={limparFiltros}>
                Limpar filtros
              </button>
            </div>
          )}

          {!lista.primeiraCarga && paginaVazia && (
            <div className={s.vazio}>
              <SearchX size={32} aria-hidden="true" />
              <h2>Não há cartas nesta página</h2>
              <button type="button" className={s.botao} onClick={() => atualizar({ page: "" }, false)}>
                Voltar para a primeira página
              </button>
            </div>
          )}

          {!lista.primeiraCarga && colecaoVazia && (
            <p className={s.dicaBusca}>Sua coleção está vazia. Adicione as cartas que você tem para anunciar e trocar.</p>
          )}

          {!lista.primeiraCarga && itens && (!vazia || (colecaoVazia && visao === "grade")) && (
            <Atualizando atualizando={lista.carregando}>
              {visao === "lista" ? (
                <TabelaColecao itens={itens} onMudou={mudou} {...acoes} />
              ) : (
                <GradeCartas variante="catalogo">
                  <ItemGrade>
                    <CartaoAdicionar
                      titulo="Adicionar carta à coleção"
                      instrucao="Busque no catálogo e adicione as cartas que você tem."
                      aria-haspopup="dialog"
                      aria-expanded={adicionando}
                      onClick={() => setAdicionando(true)}
                    />
                  </ItemGrade>
                  {itens.map((item) => (
                    <ItemGrade key={chaveDoItem(item)}>
                      <CartaColecao item={item} onEditar={setEditando} {...acoes} />
                    </ItemGrade>
                  ))}
                </GradeCartas>
              )}
            </Atualizando>
          )}

          {!lista.primeiraCarga && (page > 1 || temProxima) && !paginaVazia && (
            <Paginacao pagina={page} temProxima={temProxima} onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)} />
          )}
        </section>
      </div>

      <AdicionarCartaColecao aberto={adicionando} onFechar={() => setAdicionando(false)} onAdicionou={adicionou} />

      <ModalColecao aberto={Boolean(editando)} titulo="Editar item" onFechar={() => setEditando(null)}>
        {editando && (
          <EditarItemColecao
            key={chaveDoItem(editando)}
            item={editando}
            onSalvo={() => {
              setEditando(null);
              mudou();
            }}
          />
        )}
      </ModalColecao>

      <ModalColecao aberto={Boolean(anunciando)} titulo="Anunciar esta carta" onFechar={() => setAnunciando(null)}>
        {anunciando && (
          <AnunciarItem
            key={anunciando.id}
            item={anunciando}
            onCriado={() => {
              setAnunciando(null);
              mudou();
            }}
          />
        )}
      </ModalColecao>
    </div>
  );
}
