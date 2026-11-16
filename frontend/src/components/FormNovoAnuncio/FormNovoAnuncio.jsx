import { useState } from "react";
import s from "../../styles/paginas.module.css";

export default function FormNovoAnuncio({ disponivel, ocupado, onCriar }) {
  const [anuncio, setAnuncio] = useState({ quantity: 1, description: "" });

  function enviar(evento) {
    evento.preventDefault();
    onCriar({
      quantity: Number(anuncio.quantity),
      ...(anuncio.description.trim() ? { description: anuncio.description.trim() } : {}),
    });
  }

  return (
    <form className={s.form} onSubmit={enviar}>
      <label className={s.campo}>
        Quantidade para troca
        <input
          type="number"
          min="1"
          max={disponivel}
          value={anuncio.quantity}
          onChange={(e) => setAnuncio({ ...anuncio, quantity: e.target.value })}
        />
      </label>
      <label className={s.campo}>
        Descrição (opcional)
        <input
          value={anuncio.description}
          onChange={(e) => setAnuncio({ ...anuncio, description: e.target.value })}
        />
      </label>
      <button className={s.botao} type="submit" disabled={ocupado}>
        Criar anúncio
      </button>
    </form>
  );
}
