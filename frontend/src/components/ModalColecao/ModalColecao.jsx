import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import v from "../../styles/vitrine.module.css";
import s from "./ModalColecao.module.css";

export default function ModalColecao({ aberto, titulo, icone, larga = false, ocupado = false, onFechar, children }) {
  const dialogo = useRef(null);
  const tituloId = useId();

  useEffect(() => {
    const modal = dialogo.current;
    if (aberto && !modal.open) modal.showModal();
    if (!aberto && modal.open) modal.close();
    if (!aberto) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [aberto]);

  function fechar() {
    if (!ocupado) onFechar();
  }

  return (
    <dialog
      ref={dialogo}
      className={`${v.modalFiltros} ${s.modal} ${larga ? s.larga : ""}`}
      aria-labelledby={tituloId}
      onCancel={(evento) => {
        evento.preventDefault();
        fechar();
      }}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) fechar();
      }}
    >
      <header className={v.modalCabecalho}>
        <h2 id={tituloId}>
          {icone}
          {titulo}
        </h2>
        <button type="button" className={v.fecharModal} aria-label="Fechar" onClick={fechar} disabled={ocupado}>
          <X size={22} aria-hidden="true" />
        </button>
      </header>
      <div className={v.modalConteudo}>{aberto && children}</div>
    </dialog>
  );
}
