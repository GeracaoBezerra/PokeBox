import { useState } from "react";
import { Link } from "react-router-dom";
import { listCollection, removeCollectionItem, updateCollectionItem } from "../api/collection";
import { createListing } from "../api/listings";
import { useSession } from "../auth/useSession";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

function LinhaItem({ item, onMudou }) {
  const [form, setForm] = useState({
    quantity: item.quantity,
    condition: item.condition,
    isPublic: item.isPublic,
  });
  const [anunciando, setAnunciando] = useState(false);
  const [anuncio, setAnuncio] = useState({ quantity: 1, description: "" });
  const acao = useAcao();

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
    if (!window.confirm(`Apagar ${item.card.name} da coleção?`)) return;
    const { ok } = await acao.executar(() => removeCollectionItem(item.id));
    if (ok) onMudou();
  }

  async function anunciar(evento) {
    evento.preventDefault();
    const { ok } = await acao.executar(
      () =>
        createListing({
          collectionItemId: item.id,
          quantity: Number(anuncio.quantity),
          ...(anuncio.description.trim() ? { description: anuncio.description.trim() } : {}),
        }),
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
          <ImagemCarta className={s.miniatura} src={item.card.imageUrl} alt={item.card.name} />
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
            {anunciando && (
              <form className={s.form} onSubmit={anunciar}>
                <label className={s.campo}>
                  Quantidade para troca
                  <input
                    type="number"
                    min="1"
                    max={item.available}
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
                <button className={s.botao} type="submit" disabled={acao.ocupado}>
                  Criar anúncio
                </button>
              </form>
            )}
            <Aviso erro={acao.erro} sucesso={acao.sucesso} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function MyCollectionPage() {
  const session = useSession();
  const { dados: itens, erro, carregando, recarregar } = useCarregar(listCollection);

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Minha coleção</h1>
      <p className={s.subtitulo}>
        Disponível = quantidade − reservada (reservada é o que está numa troca em andamento). Para adicionar cartas, use o{" "}
        <Link className={s.link} to="/catalogo">
          catálogo
        </Link>
        . Seu perfil público:{" "}
        <Link className={s.link} to={`/u/${session?.user?.username}`}>
          /u/{session?.user?.username}
        </Link>
      </p>

      <Aviso erro={erro} />
      {carregando && !itens && <p className={s.suave}>Carregando...</p>}
      {itens && itens.length === 0 && <p className={s.suave}>Sua coleção está vazia.</p>}

      {itens && itens.length > 0 && (
        <div className={s.tabelaWrap}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th />
                <th>Carta</th>
                <th>Variante</th>
                <th>Condição</th>
                <th>Quantidade</th>
                <th>Reservada</th>
                <th>Disponível</th>
                <th>Pública</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <LinhaItem key={item.id} item={item} onMudou={recarregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
