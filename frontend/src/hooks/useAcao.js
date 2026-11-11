import { useState } from "react";

export function useAcao() {
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao, mensagem) {
    setErro(null);
    setSucesso(null);
    setOcupado(true);
    try {
      const resultado = await acao();
      if (mensagem) setSucesso(mensagem);
      return { ok: true, resultado };
    } catch (e) {
      setErro(e);
      return { ok: false };
    } finally {
      setOcupado(false);
    }
  }

  return { erro, sucesso, ocupado, executar };
}
