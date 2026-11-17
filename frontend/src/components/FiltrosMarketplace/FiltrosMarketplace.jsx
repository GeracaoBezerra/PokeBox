import { useCallback, useState } from "react";
import s from "../../styles/paginas.module.css";
import { usernameValido } from "../../utils/filtrosMarketplace";
import { ACABAMENTOS, CONDICOES, ORDENACOES, TIPOS } from "../../utils/rotulos";
import CampoBusca from "../CampoBusca/CampoBusca";
import styles from "./FiltrosMarketplace.module.css";

function Opcoes({ rotulo, campo, valor, opcoes, todas = "Todas", onMudar }) {
  return (
    <label className={s.campo}>
      {rotulo}
      <select value={valor} onChange={(e) => onMudar({ [campo]: e.target.value })}>
        <option value="">{todas}</option>
        {Object.entries(opcoes).map(([codigo, texto]) => (
          <option key={codigo} value={codigo}>
            {texto}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FiltrosMarketplace({ filtros, raridades, logado, onMudar }) {
  const [aberto, setAberto] = useState(false);

  const buscarColecionador = useCallback(
    (texto) => {
      const username = texto.toLowerCase();
      if (username === "" || usernameValido(username)) onMudar({ username });
    },
    [onMudar]
  );

  return (
    <aside className={styles.filtros}>
      <button
        type="button"
        className={`${s.botaoSecundario} ${styles.alternar}`}
        aria-expanded={aberto}
        aria-controls="painel-filtros"
        onClick={() => setAberto(!aberto)}
      >
        {aberto ? "Fechar filtros" : "Filtros"}
      </button>

      <div id="painel-filtros" className={`${styles.painel} ${aberto ? styles.aberto : ""}`}>
        <Opcoes
          rotulo="Ordenar por"
          campo="sort"
          valor={filtros.sort}
          opcoes={{ oldest: ORDENACOES.oldest, name: ORDENACOES.name }}
          todas={ORDENACOES.recent}
          onMudar={onMudar}
        />
        <Opcoes rotulo="Condição" campo="condition" valor={filtros.condition} opcoes={CONDICOES} onMudar={onMudar} />
        <Opcoes rotulo="Acabamento" campo="finish" valor={filtros.finish} opcoes={ACABAMENTOS} todas="Todos" onMudar={onMudar} />
        <Opcoes
          rotulo="1ª edição"
          campo="firstEdition"
          valor={filtros.firstEdition}
          opcoes={{ true: "Só 1ª edição", false: "Sem 1ª edição" }}
          onMudar={onMudar}
        />
        <Opcoes rotulo="Tipo" campo="type" valor={filtros.type} opcoes={TIPOS} todas="Todos" onMudar={onMudar} />
        {raridades.length > 0 && (
          <Opcoes
            rotulo="Raridade"
            campo="rarity"
            valor={filtros.rarity}
            opcoes={Object.fromEntries(raridades.map((r) => [r, r]))}
            onMudar={onMudar}
          />
        )}
        <CampoBusca
          rotulo="Colecionador"
          valor={filtros.username}
          placeholder="ex.: ash"
          maxLength={20}
          onMudar={buscarColecionador}
        />
        {logado && (
          <label className={s.checkbox}>
            <input
              type="checkbox"
              checked={filtros.wishlist === "1"}
              onChange={(e) => onMudar({ wishlist: e.target.checked ? "1" : "" })}
            />
            Só cartas da minha wishlist (nesta página)
          </label>
        )}
      </div>
    </aside>
  );
}
