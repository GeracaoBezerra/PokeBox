import { useCallback, useMemo, useRef, useState } from "react";
import { ConfirmacaoContext } from "../../context/confirmacaoContext";
import ConfirmModal from "../ConfirmModal/ConfirmModal";

export default function ConfirmacaoProvider({ children }) {
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState({});
  const resolverRef = useRef(null);

  const responder = useCallback((resposta) => {
    resolverRef.current?.(resposta);
    resolverRef.current = null;
    setAberto(false);
  }, []);

  const pedir = useCallback((novasOpcoes) => {
    resolverRef.current?.(false);
    return new Promise((resolver) => {
      resolverRef.current = resolver;
      setOpcoes(novasOpcoes);
      setAberto(true);
    });
  }, []);

  const valor = useMemo(() => ({ pedir }), [pedir]);

  return (
    <ConfirmacaoContext.Provider value={valor}>
      {children}
      <ConfirmModal
        {...opcoes}
        aberto={aberto}
        onConfirmar={() => responder(true)}
        onCancelar={() => responder(false)}
      />
    </ConfirmacaoContext.Provider>
  );
}
