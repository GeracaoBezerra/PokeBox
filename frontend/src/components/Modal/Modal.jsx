import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import s from "./Modal.module.css";

export default function Modal({ aberto, titulo, onFechar, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className={s.modal}
      aria-label={titulo}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && onFechar()}
    >
      <header className={s.cabecalho}>
        <h2>{titulo}</h2>
        <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      {aberto && children}
    </dialog>
  );
}
