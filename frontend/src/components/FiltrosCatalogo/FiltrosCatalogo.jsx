import { useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { getCardFilters } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import Aviso from "../Aviso/Aviso";
import s from "../../styles/catalogo.module.css";

const TIPOS = { Grass: "Grama", Fire: "Fogo", Water: "Água", Lightning: "Elétrico", Psychic: "Psíquico", Fighting: "Lutador", Darkness: "Sombrio", Dragon: "Dragão", Fairy: "Fada", Metal: "Metal", Colorless: "Incolor" };
const CATEGORIAS = { Pokemon: "Pokémon", Trainer: "Treinador", Energy: "Energia" };
const VAZIOS = { category: "", type: "", rarity: "", set: "" };

function Grupo({ campo, titulo, valores, selecionado, onAlterar, rotulos = {} }) {
  const nome = useId();
  return (
    <fieldset className={s.grupo}>
      <legend>{titulo}</legend>
      <div className={s.opcoes}>
        <label><input type="radio" name={nome} checked={!selecionado} onChange={() => onAlterar(campo, "")} /> Todas as opções</label>
        {valores.map((valor) => <label key={valor}><input type="radio" name={nome} value={valor} checked={selecionado === valor} onChange={() => onAlterar(campo, valor)} />{rotulos[valor] ?? valor}</label>)}
      </div>
    </fieldset>
  );
}

// O desktop e o modal usam exatamente os mesmos controles.
function OpcoesFiltros({ dados, erro, carregando, recarregar, filtros, onAlterar }) {
  return (
    <div className={s.conteudoFiltros}>
      {carregando && <p className={s.suave} role="status">Carregando filtros…</p>}
      <Aviso erro={erro} />
      {erro && <button className={s.botao} onClick={recarregar}>Tentar novamente</button>}
      {!carregando && dados && <>
        <Grupo campo="category" titulo="Categoria" valores={dados.categories} selecionado={filtros.category} onAlterar={onAlterar} rotulos={CATEGORIAS} />
        <Grupo campo="type" titulo="Tipo" valores={dados.types} selecionado={filtros.type} onAlterar={onAlterar} rotulos={TIPOS} />
        <Grupo campo="rarity" titulo="Raridade" valores={dados.rarities} selecionado={filtros.rarity} onAlterar={onAlterar} />
        <label className={s.campo}>Expansão<select value={filtros.set} onChange={(e) => onAlterar("set", e.target.value)}><option value="">Todas as expansões</option>{dados.sets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}</select></label>
        <p className={s.ajuda}>Selecione uma opção por grupo. Os filtros são combinados na busca.</p>
      </>}
    </div>
  );
}

export default function FiltrosCatalogo({ lang, filtros, onAlterar, onLimpar, onAplicar }) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);
  const modalRef = useRef(null);
  const botaoRef = useRef(null);
  const tituloId = useId();
  const modalId = useId();
  const carregamento = useCarregar(() => getCardFilters(lang), lang);
  const total = Object.values(filtros).filter(Boolean).length;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const aoRedimensionar = () => { if (desktop.matches) modalRef.current?.close(); };
    desktop.addEventListener("change", aoRedimensionar);
    return () => {
      document.body.style.overflow = anterior;
      desktop.removeEventListener("change", aoRedimensionar);
    };
  }, [aberto]);

  function abrir() {
    setRascunho({ ...filtros });
    modalRef.current.showModal();
    setAberto(true);
  }

  function aplicar() {
    onAplicar(rascunho);
    modalRef.current.close();
  }

  function clicarFora(event) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modalRef.current.close();
  }

  return (
    <aside className={s.filtros} aria-label="Filtros do catálogo">
      <div className={s.filtrosDesktop}>
        <div className={s.filtrosTitulo}><h2><SlidersHorizontal size={18} aria-hidden="true" /> Filtrar por</h2>{total > 0 && <button className={s.limpar} onClick={onLimpar}>Limpar <X size={14} aria-hidden="true" /></button>}</div>
        <OpcoesFiltros {...carregamento} filtros={filtros} onAlterar={onAlterar} />
      </div>
      <button ref={botaoRef} className={s.abrirFiltros} onClick={abrir} aria-haspopup="dialog" aria-expanded={aberto} aria-controls={modalId}><SlidersHorizontal size={18} aria-hidden="true" /> Filtros{total > 0 && <span className={s.totalFiltros}>{total}</span>}</button>
      <dialog ref={modalRef} id={modalId} className={s.modalFiltros} aria-labelledby={tituloId} onClick={clicarFora} onClose={() => { setAberto(false); botaoRef.current?.focus(); }}>
        <header className={s.modalCabecalho}>
          <h2 id={tituloId}><SlidersHorizontal size={20} aria-hidden="true" /> Filtrar cartas</h2>
          <button type="button" className={s.fecharModal} onClick={() => modalRef.current.close()} aria-label="Fechar filtros" autoFocus><X size={22} aria-hidden="true" /></button>
        </header>
        <div className={s.modalConteudo}><OpcoesFiltros {...carregamento} filtros={rascunho} onAlterar={(campo, valor) => setRascunho((atual) => ({ ...atual, [campo]: valor }))} /></div>
        <footer className={s.modalRodape}>
          <button className={s.limpar} onClick={() => setRascunho({ ...VAZIOS })}>Limpar filtros</button>
          <button className={s.botao} onClick={aplicar}>Ver resultados</button>
        </footer>
      </dialog>
    </aside>
  );
}
