import { useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import s from "../../styles/vitrine.module.css";

export function GrupoFiltro({ titulo, valor, opcoes, todas = "Todas as opções", rotuloAtual = valor, onAlterar }) {
  const nome = useId();
  const indisponivel = valor && !opcoes.some(([codigo]) => codigo === valor);
  return (
    <fieldset className={s.grupo}>
      <legend>{titulo}</legend>
      <div className={s.opcoes}>
        <label>
          <input type="radio" name={nome} checked={!valor} onChange={() => onAlterar("")} /> {todas}
        </label>
        {indisponivel && (
          <label>
            <input type="radio" name={nome} value={valor} checked disabled />
            {rotuloAtual} (indisponível)
          </label>
        )}
        {opcoes.map(([codigo, rotulo]) => (
          <label key={codigo}>
            <input type="radio" name={nome} value={codigo} checked={valor === codigo} onChange={() => onAlterar(codigo)} />
            {rotulo}
          </label>
        ))}
      </div>
      {indisponivel && <LimparSelecao titulo={titulo} onAlterar={onAlterar} />}
    </fieldset>
  );
}

function LimparSelecao({ titulo, onAlterar }) {
  return (
    <button type="button" className={s.limpar} onClick={() => onAlterar("")} aria-label={`Limpar filtro ${titulo}`}>
      Limpar
    </button>
  );
}

export function SeletorExpansao({ valor, expansoes, rotuloAtual = valor, onAlterar }) {
  const indisponivel = valor && !expansoes.some(({ id }) => id === valor);
  return (
    <div>
      <label className={s.campo}>
        Expansão
        <select value={valor} onChange={(evento) => onAlterar(evento.target.value)}>
          <option value="">Todas as expansões</option>
          {indisponivel && <option value={valor} disabled>{rotuloAtual} (indisponível)</option>}
          {expansoes.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      {indisponivel && <LimparSelecao titulo="Expansão" onAlterar={onAlterar} />}
    </div>
  );
}

export function GruposCarregando({ grupos = 1, opcoes = 4, comLista = false, rotulo = "Carregando filtros" }) {
  return (
    <div className={s.carregandoFiltros} role="status" aria-label={rotulo} aria-busy="true">
      {Array.from({ length: grupos }, (_, grupo) => (
        <div key={grupo} className={s.grupoCarregando} aria-hidden="true">
          <span className={s.tituloCarregando} />
          {Array.from({ length: opcoes }, (_, opcao) => (
            <span key={opcao} className={s.opcaoCarregando} />
          ))}
        </div>
      ))}
      {comLista && (
        <div className={s.grupoCarregando} aria-hidden="true">
          <span className={s.tituloCarregando} />
          <span className={s.listaCarregando} />
        </div>
      )}
    </div>
  );
}

export default function PainelFiltros({ rotulo, tituloModal, filtros, onAlterar, onLimpar, onAplicar, children }) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);
  const modalRef = useRef(null);
  const botaoRef = useRef(null);
  const tituloId = useId();
  const modalId = useId();
  const total = Object.values(filtros).filter(Boolean).length;

  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const aoRedimensionar = () => {
      if (desktop.matches) modalRef.current?.close();
    };
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

  function limparRascunho() {
    setRascunho(Object.fromEntries(Object.keys(filtros).map((campo) => [campo, ""])));
  }

  function alterarRascunho(campo, valor) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function clicarFora(evento) {
    if (evento.target !== evento.currentTarget) return;
    const area = evento.currentTarget.getBoundingClientRect();
    const fora =
      evento.clientX < area.left || evento.clientX > area.right || evento.clientY < area.top || evento.clientY > area.bottom;
    if (fora) modalRef.current.close();
  }

  function fechou() {
    setAberto(false);
    botaoRef.current?.focus();
  }

  return (
    <aside className={s.filtros} aria-label={rotulo}>
      <div className={s.filtrosDesktop}>
        <div className={s.filtrosTitulo}>
          <h2>
            <SlidersHorizontal size={18} aria-hidden="true" /> Filtrar por
          </h2>
          {total > 0 && (
            <button type="button" className={s.limpar} onClick={onLimpar}>
              Limpar <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={s.conteudoFiltros}>{children(filtros, onAlterar, false)}</div>
      </div>

      <button
        ref={botaoRef}
        type="button"
        className={s.abrirFiltros}
        onClick={abrir}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={modalId}
      >
        <SlidersHorizontal size={18} aria-hidden="true" /> Filtros
        {total > 0 && <span className={s.totalFiltros}>{total}</span>}
      </button>

      <dialog ref={modalRef} id={modalId} className={s.modalFiltros} aria-labelledby={tituloId} onClick={clicarFora} onClose={fechou}>
        <header className={s.modalCabecalho}>
          <h2 id={tituloId}>
            <SlidersHorizontal size={20} aria-hidden="true" /> {tituloModal}
          </h2>
          <button type="button" className={s.fecharModal} onClick={() => modalRef.current.close()} aria-label="Fechar filtros" autoFocus>
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className={s.modalConteudo}>
          {aberto && <div className={s.conteudoFiltros}>{children(rascunho, alterarRascunho, true)}</div>}
        </div>
        <footer className={s.modalRodape}>
          <button type="button" className={s.limpar} onClick={limparRascunho}>
            Limpar filtros
          </button>
          <button type="button" className={s.botao} onClick={aplicar}>
            Ver resultados
          </button>
        </footer>
      </dialog>
    </aside>
  );
}
