import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import s from "../../styles/vitrine.module.css";
import { IDIOMAS } from "../../utils/idioma";

export default function BarraBusca({ rotulo, placeholder, valor, idioma, onBuscar }) {
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);
  const onBuscarRef = useRef(onBuscar);

  useEffect(() => {
    onBuscarRef.current = onBuscar;
  });

  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  useEffect(() => {
    if (texto.trim() === valor) return undefined;
    const espera = setTimeout(() => onBuscarRef.current(texto.trim(), idioma), 400);
    return () => clearTimeout(espera);
  }, [texto, valor, idioma]);

  function enviar(evento) {
    evento.preventDefault();
    onBuscarRef.current(texto.trim(), idioma);
  }

  return (
    <form className={s.busca} onSubmit={enviar} role="search">
      <label className={s.campo}>
        {rotulo}
        <span className={s.entrada}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            maxLength={50}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
          />
        </span>
      </label>
      {idioma && (
        <label className={s.campo}>
          Idioma
          <select value={idioma} onChange={(e) => onBuscarRef.current(texto.trim(), e.target.value)}>
            {Object.entries(IDIOMAS).map(([codigo, nome]) => (
              <option key={codigo} value={codigo}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      )}
    </form>
  );
}
