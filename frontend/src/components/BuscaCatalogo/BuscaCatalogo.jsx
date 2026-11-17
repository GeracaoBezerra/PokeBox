import { useState } from "react";
import { Search } from "lucide-react";
import s from "../../styles/catalogo.module.css";

const IDIOMAS = { en: "Inglês", pt: "Português", es: "Espanhol", fr: "Francês", de: "Alemão", it: "Italiano", ja: "Japonês" };

export default function BuscaCatalogo({ nome, idioma, onBuscar }) {
  const [busca, setBusca] = useState(nome);
  const [idiomaEscolhido, setIdiomaEscolhido] = useState(idioma);

  function enviar(evento) {
    evento.preventDefault();
    onBuscar(busca, idiomaEscolhido);
  }

  return (
    <form className={s.busca} onSubmit={enviar} role="search">
      <label className={s.campo}>
        Buscar cartas
        <input type="search" maxLength={50} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome da carta ou expansão…" />
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
        <Search size={16} aria-hidden="true" /> Buscar
      </button>
    </form>
  );
}
