import { useState } from "react";
import s from "../../styles/paginas.module.css";

export default function FiltrosMarketplace({ cardId, username, onFiltrar }) {
  const [filtros, setFiltros] = useState({ cardId, username });

  function enviar(evento) {
    evento.preventDefault();
    onFiltrar({ cardId: filtros.cardId.trim(), username: filtros.username.trim().toLowerCase() });
  }

  return (
    <form className={s.form} onSubmit={enviar}>
      <label className={s.campo}>
        Id da carta
        <input
          value={filtros.cardId}
          onChange={(e) => setFiltros({ ...filtros, cardId: e.target.value })}
          placeholder="ex.: base1-4"
        />
      </label>
      <label className={s.campo}>
        Colecionador
        <input
          value={filtros.username}
          onChange={(e) => setFiltros({ ...filtros, username: e.target.value })}
          placeholder="ex.: ash"
        />
      </label>
      <button className={s.botao} type="submit">
        Filtrar
      </button>
    </form>
  );
}
