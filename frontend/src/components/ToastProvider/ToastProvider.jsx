import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { ToastContext } from "../../context/toastContext";
import styles from "./ToastProvider.module.css";

const DURACAO = { sucesso: 4000, info: 4000, erro: 8000 };

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const proximoId = useRef(0);
  const timers = useRef(new Map());

  const fechar = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((lista) => lista.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo, mensagem, { acao } = {}) => {
      const id = ++proximoId.current;
      setToasts((lista) => [...lista, { id, tipo, mensagem, acao }]);
      timers.current.set(id, setTimeout(() => fechar(id), DURACAO[tipo]));
      return id;
    },
    [fechar]
  );

  useEffect(() => {
    const ativos = timers.current;
    return () => ativos.forEach((timer) => clearTimeout(timer));
  }, []);

  const toast = useMemo(
    () => ({
      sucesso: (mensagem, opcoes) => mostrar("sucesso", mensagem, opcoes),
      info: (mensagem, opcoes) => mostrar("info", mensagem, opcoes),
      erro: (mensagem, opcoes) => mostrar("erro", mensagem, opcoes),
      fechar,
    }),
    [mostrar, fechar]
  );

  function lista(tipos) {
    return toasts
      .filter((t) => tipos.includes(t.tipo))
      .map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.tipo]}`}>
          <span className={styles.mensagem}>{t.mensagem}</span>
          {t.acao && (
            <button
              type="button"
              className={styles.acao}
              onClick={() => {
                t.acao.onClick();
                fechar(t.id);
              }}
            >
              {t.acao.rotulo}
            </button>
          )}
          <button type="button" className={styles.fechar} aria-label="Fechar aviso" onClick={() => fechar(t.id)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ));
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.pilha}>
        <div className={styles.regiao} role="status" aria-live="polite">
          {lista(["sucesso", "info"])}
        </div>
        <div className={styles.regiao} role="alert">
          {lista(["erro"])}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
