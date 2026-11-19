import { useState } from "react";
import { Link } from "react-router-dom";
import { removeCollectionItem, updateCollectionItem } from "../../api/collection";
import { createListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/paginas.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import FormNovoAnuncio from "../FormNovoAnuncio/FormNovoAnuncio";
import MiniaturaCarta from "../MiniaturaCarta/MiniaturaCarta";

export default function LinhaColecao({ item, onMudou }) {
  const [form, setForm] = useState({
    quantity: item.quantity,
    condition: item.condition,
    isPublic: item.isPublic,
  });
  const [anunciando, setAnunciando] = useState(false);
  const acao = useAcao();
  const { pedir } = useConfirmacao();

  const mudou =
    Number(form.quantity) !== item.quantity || form.condition !== item.condition || form.isPublic !== item.isPublic;

  async function salvar() {
    const dados = {};
    if (Number(form.quantity) !== item.quantity) dados.quantity = Number(form.quantity);
    if (form.condition !== item.condition) dados.condition = form.condition;
    if (form.isPublic !== item.isPublic) dados.isPublic = form.isPublic;
    const { ok } = await acao.executar(() => updateCollectionItem(item.id, dados), "Item atualizado.");
    if (ok) onMudou();
  }

  async function apagar() {
    const confirmou = await pedir({
      titulo: "Apagar carta da coleção?",
      mensagem: `${item.card.name} sai da sua coleção. Não dá para desfazer.`,
      textoConfirmar: "Apagar",
      perigo: true,
    });
    if (!confirmou) return;
    const { ok } = await acao.executar(() => removeCollectionItem(item.id));
    if (ok) onMudou();
  }

  async function anunciar(anuncio) {
    const { ok } = await acao.executar(
      () => createListing({ collectionItemId: item.id, ...anuncio }),
      "Anúncio criado. Veja em Meus anúncios."
    );
    if (ok) {
      setAnunciando(false);
      onMudou();
    }
  }

  return (
    <>
      <tr>
        <td>
          <MiniaturaCarta card={item.card} />
        </td>
        <td>
          <Link className={s.link} to={`/cards/${item.cardId}`}>
            {item.card.name}
          </Link>
          <div className={s.suave}>
            {item.card.setName} · {item.card.number}
          </div>
        </td>
        <td>{variante(item)}</td>
        <td className={s.campo}>
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
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
            min="0"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </td>
        <td>{item.reservedQuantity}</td>
        <td>{item.available}</td>
        <td>
          <input
            type="checkbox"
            aria-label="Pública"
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
        </td>
        <td>
          <div className={s.acoes}>
            <button className={s.botao} onClick={salvar} disabled={!mudou || acao.ocupado}>
              Salvar
            </button>
            {item.available > 0 && (
              <button className={s.botaoSecundario} onClick={() => setAnunciando(!anunciando)}>
                Anunciar
              </button>
            )}
            {item.reservedQuantity === 0 && (
              <button className={s.botaoPerigo} onClick={apagar} disabled={acao.ocupado}>
                Apagar
              </button>
            )}
          </div>
        </td>
      </tr>
      {(anunciando || acao.erro || acao.sucesso) && (
        <tr>
          <td colSpan={9}>
            {anunciando && <FormNovoAnuncio disponivel={item.available} ocupado={acao.ocupado} onCriar={anunciar} />}
            <Aviso erro={acao.erro} sucesso={acao.sucesso} />
          </td>
        </tr>
      )}
    </>
  );
}
