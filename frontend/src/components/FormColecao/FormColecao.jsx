import { useState } from "react";
import { addToCollection } from "../../api/collection";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/paginas.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";

const ACABAMENTO_DA_VARIANTE = { normal: "NORMAL", holo: "HOLO", reverse: "REVERSE" };

function acabamentosDisponiveis(variants = {}) {
  const lista = Object.entries(ACABAMENTO_DA_VARIANTE)
    .filter(([chave]) => variants[chave])
    .map(([, finish]) => finish);
  return lista.length ? lista : ["NORMAL"];
}

export default function FormColecao({ card, onAdicionado }) {
  const acabamentos = acabamentosDisponiveis(card.variants);
  const [form, setForm] = useState({
    finish: acabamentos[0],
    firstEdition: false,
    condition: "NEAR_MINT",
    quantity: 1,
    isPublic: true,
  });
  const { erro, sucesso, ocupado, executar } = useAcao();

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    const { ok } = await executar(
      () => addToCollection({ cardId: card.id, ...form, quantity: Number(form.quantity) }),
      "Carta adicionada à coleção."
    );
    if (ok) onAdicionado();
  }

  return (
    <form className={s.painel} onSubmit={enviar}>
      <h3>Adicionar à minha coleção</h3>
      <div className={s.form}>
        <label className={s.campo}>
          Acabamento
          <select value={form.finish} onChange={(e) => alterar("finish", e.target.value)}>
            {["NORMAL", "HOLO", "REVERSE"].map((finish) => (
              <option key={finish} value={finish}>
                {variante({ finish, firstEdition: false })}
                {acabamentos.includes(finish) ? "" : " (a carta não tem)"}
              </option>
            ))}
          </select>
        </label>
        <label className={s.campo}>
          Condição
          <select value={form.condition} onChange={(e) => alterar("condition", e.target.value)}>
            {Object.entries(CONDICOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className={s.campo}>
          Quantidade
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => alterar("quantity", e.target.value)}
          />
        </label>
        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={form.firstEdition}
            onChange={(e) => alterar("firstEdition", e.target.checked)}
          />
          1ª edição{card.variants?.firstEdition ? "" : " (a carta não tem)"}
        </label>
        <label className={s.checkbox}>
          <input type="checkbox" checked={form.isPublic} onChange={(e) => alterar("isPublic", e.target.checked)} />
          Pública
        </label>
        <button className={s.botao} type="submit" disabled={ocupado}>
          Adicionar
        </button>
      </div>
      <Aviso erro={erro} sucesso={sucesso} />
    </form>
  );
}
