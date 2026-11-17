import { useEffect, useState } from "react";
import s from "../../styles/paginas.module.css";

export default function CampoBusca({ rotulo, valor, placeholder, maxLength = 50, onMudar }) {
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);

  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  useEffect(() => {
    if (texto.trim() === valor) return undefined;
    const espera = setTimeout(() => onMudar(texto.trim()), 400);
    return () => clearTimeout(espera);
  }, [texto, valor, onMudar]);

  function teclar(evento) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      onMudar(texto.trim());
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
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={teclar}
      />
    </label>
  );
}
