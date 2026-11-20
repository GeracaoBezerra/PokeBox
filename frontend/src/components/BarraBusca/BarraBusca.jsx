import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import s from "../../styles/vitrine.module.css";

export default function BarraBusca({ rotulo, placeholder, valor, onBuscar, inputRef }) {
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
    const espera = setTimeout(() => onBuscarRef.current(texto.trim()), 400);
    return () => clearTimeout(espera);
  }, [texto, valor]);

  function enviar(evento) {
    evento.preventDefault();
    onBuscarRef.current(texto.trim());
  }

  return (
    <form className={s.busca} onSubmit={enviar} role="search">
      <label className={s.campo}>
        {rotulo}
        <span className={s.entrada}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            ref={inputRef}
            maxLength={50}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
          />
        </span>
      </label>
    </form>
  );
}
