import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ouvirSessaoExpirada } from "../../auth/sessaoExpirada";
import { useToast } from "../../hooks/useToast";

export default function SessaoExpirada() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(
    () =>
      ouvirSessaoExpirada(() => {
        toast.info("Sua sessão expirou. Entre de novo.");
        const de = window.location.pathname + window.location.search;
        navigate("/login", { state: { de } });
      }),
    [navigate, toast]
  );

  return null;
}
