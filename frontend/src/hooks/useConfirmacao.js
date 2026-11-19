import { useContext } from "react";
import { ConfirmacaoContext } from "../context/confirmacaoContext";

export function useConfirmacao() {
  const contexto = useContext(ConfirmacaoContext);
  if (!contexto) throw new Error("useConfirmacao precisa estar dentro do ConfirmacaoProvider");
  return contexto;
}
