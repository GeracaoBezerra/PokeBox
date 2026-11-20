import { useContext } from "react";
import { ToastContext } from "../context/toastContext";

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast precisa estar dentro do ToastProvider");
  return toast;
}
