import { useState } from "react";
import { Link } from "react-router-dom";
import { updateCollectionItem } from "../../api/collection";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/paginas.module.css";
import { mudancasDoItem, quantidadeValida } from "../../utils/colecao";
import { CONDICOES, variante } from "../../utils/rotulos";
import AcoesItemColecao from "../AcoesItemColecao/AcoesItemColecao";
import Aviso from "../Aviso/Aviso";
import MiniaturaCarta from "../MiniaturaCarta/MiniaturaCarta";

export default function LinhaColecao({ item, ocupado, onMudou, onAnunciar, onApagar, onTirar }) {
  const [form, setForm] = useState({
    quantity: item.quantity,
    condition: item.condition,
    isPublic: item.isPublic,
  });
  const acao = useAcao();
  const nome = item.card.name;
  const mudancas = mudancasDoItem(item, form);
  const valida = quantidadeValida(form.quantity);
  const podeSalvar = Object.keys(mudancas).length > 0 && valida;

  async function salvar() {
    const { ok } = await acao.executar(() => updateCollectionItem(item.id, mudancas), "Item atualizado.");
    if (ok) onMudou();
  }

  return (
    <>
      <tr>
        <td>
          <MiniaturaCarta card={item.card} />
        </td>
        <td>
          <Link className={s.link} to={`/cards/${encodeURIComponent(item.cardId)}`}>
            {nome}
          </Link>
          <div className={s.suave}>
            {item.card.setName} · {item.card.number}
          </div>
          {!item.isPublic && <div className={s.suave}>Privada</div>}
        </td>
        <td>{variante(item)}</td>
        <td className={s.campo}>
          <select
            aria-label={`Condição de ${nome}`}
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          >
            {Object.entries(CONDICOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </td>
        <td className={s.campo}>
          <input
            type="number"
            min="1"
            step="1"
            aria-label={`Quantidade de ${nome}`}
            aria-invalid={!valida}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </td>
        <td>{item.reservedQuantity}</td>
        <td>{item.available}</td>
        <td>
          <input
            type="checkbox"
            aria-label={`${nome} pública`}
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
        </td>
        <td>
          <AcoesItemColecao
            item={item}
            ocupado={ocupado || acao.ocupado}
            podeSalvar={podeSalvar}
            onSalvar={salvar}
            onAnunciar={onAnunciar}
            onApagar={onApagar}
            onTirar={onTirar}
          />
        </td>
      </tr>
      {acao.erro && (
        <tr>
          <td colSpan={9}>
            <Aviso erro={acao.erro} />
          </td>
        </tr>
      )}
    </>
  );
}
