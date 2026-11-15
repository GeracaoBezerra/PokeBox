import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getCard } from "../api/cards";
import { addToCollection } from "../api/collection";
import { addToWishlist } from "../api/wishlist";
import { useSession } from "../auth/useSession";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

const ACABAMENTO_DA_VARIANTE = { normal: "NORMAL", holo: "HOLO", reverse: "REVERSE" };

function acabamentosDisponiveis(variants = {}) {
  const lista = Object.entries(ACABAMENTO_DA_VARIANTE)
    .filter(([chave]) => variants[chave])
    .map(([, finish]) => finish);
  return lista.length ? lista : ["NORMAL"];
}

function formatarPreco(preco) {
  if (!preco) return "Sem preço de referência";
  const valor = preco.value.toLocaleString("pt-BR", { style: "currency", currency: preco.currency });
  return `${valor} (${preco.source === "tcgplayer" ? "TCGplayer" : "Cardmarket"})`;
}

function FormColecao({ card, onAdicionado }) {
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

export default function CardPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const lang = params.get("lang") ?? "en";
  const session = useSession();
  const { dados, erro, carregando, recarregar } = useCarregar(() => getCard(id, lang), `${id}|${lang}|${!!session}`);
  const wishlist = useAcao();

  if (carregando && !dados) return <div className={s.pagina}>Carregando...</div>;
  if (erro) {
    return (
      <div className={s.pagina}>
        <Aviso erro={erro} />
      </div>
    );
  }

  const { card, user, listings } = dados;

  async function adicionarWishlist() {
    const { ok } = await wishlist.executar(() => addToWishlist(card.id), "Carta adicionada à wishlist.");
    if (ok) recarregar();
  }

  return (
    <div className={s.pagina}>
      <div className={s.detalhe}>
        <div>
          <ImagemCarta className={s.imagemCarta} src={card.image?.large} alt={card.name} />
        </div>

        <div>
          <h1 className={s.titulo}>{card.name}</h1>
          <p className={s.subtitulo}>
            {card.set?.name} · {card.number} · <code>{card.id}</code>
          </p>

          <dl className={s.lista}>
            <dt>Categoria</dt>
            <dd>{card.category}</dd>
            {card.rarity && (
              <>
                <dt>Raridade</dt>
                <dd>{card.rarity}</dd>
              </>
            )}
            {card.hp && (
              <>
                <dt>HP</dt>
                <dd>{card.hp}</dd>
              </>
            )}
            {card.types?.length > 0 && (
              <>
                <dt>Tipo</dt>
                <dd>{card.types.join(", ")}</dd>
              </>
            )}
            {card.illustrator && (
              <>
                <dt>Ilustrador</dt>
                <dd>{card.illustrator}</dd>
              </>
            )}
            <dt>Variantes</dt>
            <dd>
              {Object.entries(card.variants ?? {})
                .filter(([, tem]) => tem)
                .map(([nome]) => nome)
                .join(", ") || "—"}
            </dd>
            <dt>Preço de referência</dt>
            <dd>{formatarPreco(card.marketPrice)}</dd>
          </dl>

          {card.attacks?.length > 0 && (
            <div className={s.secao}>
              <h2>Ataques</h2>
              <ul>
                {card.attacks.map((ataque) => (
                  <li key={ataque.name}>
                    <strong>{ataque.name}</strong> {ataque.damage && `· ${ataque.damage}`}
                    {ataque.effect && <p className={s.suave}>{ataque.effect}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {user ? (
            <div className={`${s.secao} ${s.painel}`}>
              <h3>Você e esta carta</h3>
              <p>
                Você tem <strong>{user.inCollection}</strong> na coleção ·{" "}
                {user.inWishlist ? "está na sua wishlist" : "não está na sua wishlist"} ·{" "}
                {user.onTradeList ? "você tem anúncio ativo dela" : "sem anúncio ativo seu"}
              </p>
              <div className={s.acoes}>
                {!user.inWishlist && user.inCollection === 0 && (
                  <button className={s.botaoSecundario} onClick={adicionarWishlist} disabled={wishlist.ocupado}>
                    Adicionar à wishlist
                  </button>
                )}
                <Link className={s.botaoSecundario} to="/colecao">
                  Ver minha coleção
                </Link>
              </div>
              <Aviso erro={wishlist.erro} sucesso={wishlist.sucesso} />
            </div>
          ) : (
            <p className={s.secao}>
              <Link className={s.link} to="/login">
                Entre
              </Link>{" "}
              para adicionar à coleção ou à wishlist.
            </p>
          )}

          {user && (
            <div className={s.secao}>
              <FormColecao card={card} onAdicionado={recarregar} />
            </div>
          )}
        </div>
      </div>

      <div className={s.secao}>
        <h2>Anúncios ativos desta carta</h2>
        {listings.length === 0 ? (
          <p className={s.suave}>Ninguém está anunciando esta carta agora.</p>
        ) : (
          <div className={s.tabelaWrap}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Colecionador</th>
                  <th>Variante</th>
                  <th>Condição</th>
                  <th>Quantidade</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {listings.map((anuncio) => (
                  <tr key={anuncio.id}>
                    <td>
                      <Link className={s.link} to={`/u/${anuncio.owner.username}`}>
                        @{anuncio.owner.username}
                      </Link>
                    </td>
                    <td>{variante(anuncio.item)}</td>
                    <td>{CONDICOES[anuncio.item.condition]}</td>
                    <td>{anuncio.quantity}</td>
                    <td>
                      <Link className={s.link} to={`/marketplace/${anuncio.id}`}>
                        Ver anúncio
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
