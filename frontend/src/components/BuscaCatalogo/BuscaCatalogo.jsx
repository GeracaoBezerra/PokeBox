import { useState } from "react";
import s from "../../styles/paginas.module.css";

const IDIOMAS = { en: "Inglês", pt: "Português", es: "Espanhol", fr: "Francês", de: "Alemão", it: "Italiano", ja: "Japonês" };

export default function BuscaCatalogo({ nome, idioma, onBuscar }) {
  const [busca, setBusca] = useState(nome);
  const [idiomaEscolhido, setIdiomaEscolhido] = useState(idioma);

  function enviar(evento) {
    evento.preventDefault();
    onBuscar(busca, idiomaEscolhido);
  }

  return (
    <form className={s.form} onSubmit={enviar}>
      <label className={s.campo}>
        Nome
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: pikachu" />
      </label>
      <label className={s.campo}>
        Idioma
        <select value={idiomaEscolhido} onChange={(e) => setIdiomaEscolhido(e.target.value)}>
          {Object.entries(IDIOMAS).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <button className={s.botao} type="submit">
        Buscar
      </button>
    </form>
  );
}
