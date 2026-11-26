import { useId, useState } from "react";
import { updateCollectionItem } from "../../api/collection";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/detalheCarta.module.css";
import { mudancasDoItem, quantidadeValida } from "../../utils/colecao";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import ErroCampo from "../ErroCampo/ErroCampo";
import e from "./EditarItemColecao.module.css";

export default function EditarItemColecao({ item, onSalvo, onSalvando, onRemover, remocaoBloqueada = false }) {
  const [form, setForm] = useState({ quantity: item.quantity, condition: item.condition, isPublic: item.isPublic });
  const { erro, ocupado, executar } = useAcao();
  const idErro = useId();
  const quantidadeMinima = item.quantity === 0 ? 0 : 1;
  const valida = quantidadeValida(form.quantity) || (quantidadeMinima === 0 && Number(form.quantity) === 0 && form.quantity !== "");
  const mudancas = mudancasDoItem(item, form);
  const podeSalvar = valida && !ocupado && Object.keys(mudancas).length > 0;

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    if (!podeSalvar) return;
    onSalvando?.(true);
    const { ok } = await executar(() => updateCollectionItem(item.id, mudancas), "Item atualizado.");
    onSalvando?.(false);
    if (ok) onSalvo();
  }

  return (
    <form className={`${s.formulario} ${e.formulario}`} onSubmit={salvar} noValidate>
      <p className={s.suave}>
        {item.card.name} · {variante(item)}
      </p>
      <div className={s.campos}>
        <label className={s.campo}>
          Condição
          <select value={form.condition} onChange={(evento) => alterar("condition", evento.target.value)}>
            {Object.entries(CONDICOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <div>
          <label className={s.campo}>
            Quantidade
            <input
              type="number"
              min={quantidadeMinima}
              step="1"
              required
              value={form.quantity}
              aria-invalid={!valida}
              aria-describedby={valida ? undefined : idErro}
              onChange={(evento) => alterar("quantity", evento.target.value)}
            />
          </label>
          <ErroCampo id={idErro} mensagem={valida ? null : `A quantidade mínima é ${quantidadeMinima}.`} />
        </div>
        <label className={s.checkbox}>
          <input type="checkbox" checked={form.isPublic} onChange={(evento) => alterar("isPublic", evento.target.checked)} />
          Visível no meu perfil público
        </label>
      </div>
      <div className={e.acoes}>
        <button className={s.botao} type="submit" disabled={!podeSalvar}>
          {ocupado ? "Salvando…" : "Salvar alterações"}
        </button>
        {onRemover && <button className={e.remover} type="button" onClick={onRemover} disabled={ocupado || remocaoBloqueada}>Remover versão</button>}
      </div>
      <Aviso erro={erro} />
    </form>
  );
}
