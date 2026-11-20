import { useEffect, useId, useRef, useState } from "react";
import { Heart, Plus, X } from "lucide-react";
import { searchCards } from "../../api/cards";
import { addToWishlist } from "../../api/wishlist";
import blastoise from "../../assets/cards/blastoise.webp";
import charizard from "../../assets/cards/charizard.webp";
import { useAcao } from "../../hooks/useAcao";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { IDIOMAS, IDIOMA_PADRAO } from "../../utils/idioma";
import v from "../../styles/vitrine.module.css";
import Aviso from "../Aviso/Aviso";
import BarraBusca from "../BarraBusca/BarraBusca";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import cartao from "../ItemWishlist/ItemWishlist.module.css";
import s from "./AdicionarWishlist.module.css";

function BuscaCartas({ itens, onAdicionar, acao, inputRef }) {
  const [termo, setTermo] = useState("");
  const [lang, setLang] = useState(IDIOMA_PADRAO);
  const [tentouAdicionar, setTentouAdicionar] = useState(false);
  const expansivel = useRef(null);
  const conteudo = useRef(null);
  const buscar = termo.length >= 2;
  const lista = useListaPaginada(
    (page) => buscar ? searchCards({ name: termo, lang, page, limit: 15 }) : Promise.resolve(null),
    JSON.stringify({ termo, lang }),
  );
  const cadastradas = new Set(itens.map((item) => item.cardId));

  useEffect(() => {
    if (typeof ResizeObserver !== "function") return undefined;
    const area = expansivel.current;
    const corpo = conteudo.current;
    const medir = () => area.style.setProperty("--altura-resultados", `${corpo.offsetHeight}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(corpo);
    return () => observador.disconnect();
  }, []);

  function rolar({ currentTarget }) {
    const falta = currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop;
    if (lista.temMais && falta <= 32) lista.carregarMais();
  }

  return (
    <>
      <div className={s.campos}>
        <BarraBusca rotulo="Buscar cartas" placeholder="Nome da carta…" valor={termo} onBuscar={setTermo} inputRef={inputRef} />
        <label className={v.campo}>
          Idioma das cartas
          <select value={lang} onChange={(evento) => setLang(evento.target.value)}>
            {Object.entries(IDIOMAS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
          </select>
        </label>
      </div>

      <div className={s.expansivel} ref={expansivel}>
        <div ref={conteudo}>
          {tentouAdicionar && <Aviso erro={acao.erro} />}
          <Aviso erro={lista.erro} onTentarDeNovo={lista.recarregar} />

          {(!buscar || lista.carregando || (!lista.erro && lista.itens.length === 0)) && (
            <p className={s.estado} role="status">
              {!buscar ? "Digite pelo menos 2 caracteres para buscar." : lista.carregando ? "Buscando cartas…" : "Nenhuma carta encontrada."}
            </p>
          )}

          {buscar && lista.itens.length > 0 && (
            <div className={s.rolagem} role="region" aria-label="Resultados da busca" tabIndex={0} onScroll={rolar}>
              <ul className={s.resultados} role="list">
                {lista.itens.map((carta) => {
                  const naWishlist = cadastradas.has(carta.id);
                  const expansao = [carta.set?.name, carta.number].filter(Boolean).join(" · ");
                  return (
                    <li className={s.resultado} key={carta.id}>
                      <div className={s.visual} aria-hidden="true">
                        <ImagemCarta className={s.miniatura} src={carta.image?.large ?? carta.image?.small} alt="" />
                      </div>
                      <div className={s.dados}>
                        <strong title={carta.name}>{carta.name}</strong>
                        {expansao && <p title={expansao}>{expansao}</p>}
                      </div>
                      <button
                        type="button"
                        className={s.acao}
                        disabled={naWishlist || acao.ocupado}
                        aria-label={naWishlist ? `${carta.name} já está na wishlist` : `Adicionar ${carta.name} à wishlist`}
                        onClick={() => {
                          setTentouAdicionar(true);
                          onAdicionar(carta.id, lang);
                        }}
                      >
                        {naWishlist ? "Na wishlist" : "Adicionar"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {(lista.temMais || lista.carregandoMais) && (
                <button type="button" className={s.mais} onClick={lista.carregarMais} disabled={lista.carregandoMais}>
                  {lista.carregandoMais ? "Carregando…" : "Ver mais cartas"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdicionarWishlist({ botaoRef, itens, onAdicionou }) {
  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(0);
  const dialogo = useRef(null);
  const busca = useRef(null);
  const dialogoId = useId();
  const tituloId = useId();
  const instrucaoId = useId();
  const acao = useAcao();

  useEffect(() => {
    const modal = dialogo.current;
    if (!aberto) {
      if (modal.open) modal.close();
      return undefined;
    }
    if (!modal.open) {
      modal.showModal();
      busca.current?.focus();
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [aberto]);

  function fechar() {
    if (!acao.ocupado) setAberto(false);
  }

  async function adicionar(id, lang) {
    const { ok, resultado } = await acao.executar(() => addToWishlist(id, lang), "Carta adicionada à wishlist.");
    if (!ok) return;
    setAberto(false);
    onAdicionou(resultado);
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={`${cartao.item} ${s.adicionar}`}
        aria-label="Adicionar carta à wishlist"
        aria-describedby={instrucaoId}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={dialogoId}
        onClick={() => { setSessao((valor) => valor + 1); setAberto(true); }}
      >
        <span className={s.arte} aria-hidden="true">
          <span className={`${s.figura} ${s.figuraSuperior}`}><img src={charizard} alt="" /></span>
          <span className={`${s.figura} ${s.figuraInferior}`}><img src={blastoise} alt="" /></span>
          <span className={s.maisArte}><Plus size={32} /></span>
        </span>
        <span className={cartao.painel}>
          <span className={cartao.identidade}>
            <span className={cartao.nome}>Adicionar carta à wishlist</span>
            <span id={instrucaoId} className={s.instrucao}>Busque no catálogo e salve as cartas que você procura.</span>
          </span>
        </span>
      </button>

      <dialog
        ref={dialogo}
        id={dialogoId}
        className={`${v.modalFiltros} ${s.modal}`}
        aria-labelledby={tituloId}
        onCancel={(evento) => { evento.preventDefault(); fechar(); }}
        onClick={(evento) => { if (evento.target === evento.currentTarget) fechar(); }}
        onClose={() => botaoRef.current?.focus()}
      >
        <header className={v.modalCabecalho}>
          <h2 id={tituloId}><Heart size={20} aria-hidden="true" /> Adicionar à wishlist</h2>
          <button type="button" className={v.fecharModal} aria-label="Fechar" onClick={fechar} disabled={acao.ocupado}>
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className={v.modalConteudo}>
          {sessao > 0 && <BuscaCartas key={sessao} itens={itens} onAdicionar={adicionar} acao={acao} inputRef={busca} />}
        </div>
      </dialog>
    </>
  );
}
