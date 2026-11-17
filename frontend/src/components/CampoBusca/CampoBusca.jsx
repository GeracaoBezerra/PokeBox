import { useEffect, useRef, useState } from "react";
import s from "../../styles/vitrine.module.css";

export default function CampoBusca({ rotulo, valor, placeholder, maxLength = 50, imediato = false, onMudar }) {
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);
  const onMudarRef = useRef(onMudar);

  useEffect(() => {
    onMudarRef.current = onMudar;
  });

  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  useEffect(() => {
    if (imediato || texto.trim() === valor) return undefined;
    const espera = setTimeout(() => onMudarRef.current(texto.trim()), 400);
    return () => clearTimeout(espera);
  }, [texto, valor, imediato]);

  function digitar(evento) {
    setTexto(evento.target.value);
    if (imediato) onMudarRef.current(evento.target.value.trim());
  }

  function teclar(evento) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      onMudarRef.current(texto.trim());
    }
  }

  return (
    <label className={s.campo}>
      {rotulo}
      <input
        type="search"
        value={texto}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={digitar}
        onKeyDown={teclar}
      />
    </label>
  );
}
