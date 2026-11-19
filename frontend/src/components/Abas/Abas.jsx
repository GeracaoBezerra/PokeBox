import { useRef } from "react";
import s from "./Abas.module.css";
import { idDaAba } from "./idDaAba";

export default function Abas({ rotulo, abas, selecionada, onSelecionar, idPainel }) {
  const botoes = useRef([]);

  function teclar(evento, indice) {
    const destinos = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: abas.length - 1 };
    if (!(evento.key in destinos)) return;
    evento.preventDefault();
    const proxima = (destinos[evento.key] + abas.length) % abas.length;
    onSelecionar(abas[proxima].valor);
    botoes.current[proxima]?.focus();
  }

  return (
    <div role="tablist" aria-label={rotulo} className={s.abas}>
      {abas.map((aba, indice) => {
        const ativa = aba.valor === selecionada;
        return (
          <button
            key={aba.valor}
            ref={(elemento) => {
              botoes.current[indice] = elemento;
            }}
            type="button"
            role="tab"
            id={idDaAba(idPainel, aba.valor)}
            aria-selected={ativa}
            aria-controls={idPainel}
            tabIndex={ativa ? 0 : -1}
            className={ativa ? s.abaAtiva : s.aba}
            onClick={() => onSelecionar(aba.valor)}
            onKeyDown={(evento) => teclar(evento, indice)}
          >
            {aba.rotulo}
            {aba.contagem != null && ` (${aba.contagem})`}
          </button>
        );
      })}
    </div>
  );
}
