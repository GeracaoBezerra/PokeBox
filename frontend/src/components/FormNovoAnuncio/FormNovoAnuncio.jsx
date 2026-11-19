import { useId, useState } from "react";
import s from "../../styles/paginas.module.css";
import ErroCampo from "../ErroCampo/ErroCampo";

export default function FormNovoAnuncio({ disponivel, ocupado, onCriar, erros = {} }) {
  const [anuncio, setAnuncio] = useState({ quantity: 1, description: "" });
  const id = useId();

  function enviar(evento) {
    evento.preventDefault();
    onCriar({
      quantity: Number(anuncio.quantity),
      ...(anuncio.description.trim() ? { description: anuncio.description.trim() } : {}),
    });
  }

  return (
    <form className={s.form} onSubmit={enviar}>
      <div>
        <label className={s.campo}>
          Quantidade para troca
          <input
            type="number"
            min="1"
            max={disponivel}
            value={anuncio.quantity}
            aria-invalid={Boolean(erros.quantity)}
            aria-describedby={erros.quantity ? `${id}-quantidade` : undefined}
            onChange={(e) => setAnuncio({ ...anuncio, quantity: e.target.value })}
          />
        </label>
        <ErroCampo id={`${id}-quantidade`} mensagem={erros.quantity} />
      </div>
      <div>
        <label className={s.campo}>
          Descrição (opcional)
          <input
            value={anuncio.description}
            aria-invalid={Boolean(erros.description)}
            aria-describedby={erros.description ? `${id}-descricao` : undefined}
            onChange={(e) => setAnuncio({ ...anuncio, description: e.target.value })}
          />
        </label>
        <ErroCampo id={`${id}-descricao`} mensagem={erros.description} />
      </div>
      <button className={s.botao} type="submit" disabled={ocupado}>
        Criar anúncio
      </button>
    </form>
  );
}
