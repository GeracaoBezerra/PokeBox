import { useEffect, useId, useRef } from "react";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  perigo = false,
  ocupado = false,
  confirmarDesativado = false,
  onConfirmar,
  onCancelar,
  children,
}) {
  const ref = useRef(null);
  const cancelarRef = useRef(null);
  const idTitulo = useId();
  const idMensagem = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (aberto && !dialog.open) {
      dialog.showModal();
      cancelarRef.current?.focus();
    }
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  function cancelarPeloTeclado(evento) {
    evento.preventDefault();
    if (!ocupado) onCancelar();
  }

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-labelledby={idTitulo}
      aria-describedby={mensagem ? idMensagem : undefined}
      onCancel={cancelarPeloTeclado}
    >
      <h2 id={idTitulo} className={styles.titulo}>
        {titulo}
      </h2>
      {mensagem && (
        <p id={idMensagem} className={styles.mensagem}>
          {mensagem}
        </p>
      )}
      {children && <div className={styles.extra}>{children}</div>}
      <div className={styles.acoes}>
        <button ref={cancelarRef} type="button" className={styles.cancelar} onClick={onCancelar} disabled={ocupado}>
          {textoCancelar}
        </button>
        <button
          type="button"
          className={perigo ? styles.perigo : styles.confirmar}
          onClick={onConfirmar}
          disabled={ocupado || confirmarDesativado}
        >
          {ocupado ? "Aguarde..." : textoConfirmar}
        </button>
      </div>
    </dialog>
  );
}
