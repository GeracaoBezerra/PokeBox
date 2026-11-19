import { useState } from "react";
import { useToast } from "./useToast";

export function useAcao() {
  const toast = useToast();
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao, mensagem, { tipo = "sucesso" } = {}) {
    setErro(null);
    setSucesso(null);
    setOcupado(true);
    try {
      const resultado = await acao();
      if (mensagem) {
        setSucesso(mensagem);
        toast[tipo](mensagem);
      }
      return { ok: true, resultado };
    } catch (e) {
      setErro(e);
      return { ok: false, erro: e };
    } finally {
      setOcupado(false);
    }
  }

  return { erro, sucesso, ocupado, executar };
}
