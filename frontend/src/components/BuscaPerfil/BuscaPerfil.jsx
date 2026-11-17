import { useState } from "react";
import s from "../../styles/paginas.module.css";

export default function BuscaPerfil({ username, onBuscar }) {
  const [busca, setBusca] = useState(username);

  function enviar(evento) {
    evento.preventDefault();
    if (busca.trim()) onBuscar(busca.trim().toLowerCase());
  }

  return (
    <form className={s.form} onSubmit={enviar}>
      <label className={s.campo}>
        Ver perfil de
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="username" />
      </label>
      <button className={s.botaoSecundario} type="submit">
        Abrir
      </button>
    </form>
  );
}
