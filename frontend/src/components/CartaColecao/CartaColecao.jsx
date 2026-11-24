import { useId } from "react";
import { Link } from "react-router-dom";
import { Megaphone, PackageMinus, Pencil, Trash2 } from "lucide-react";
import g from "../../styles/cartaGrade.module.css";
import { motivoDeNaoApagar } from "../../utils/colecao";
import { CONDICOES, variante } from "../../utils/rotulos";
import botoes from "../AcoesRapidas/AcoesRapidas.module.css";
import legenda from "../CartaAnuncio/CartaAnuncio.module.css";
import CartaCard from "../CartaCard/CartaCard";

function plural(quantidade, singular, varias) {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`;
}

function detalhesDoItem(item) {
  return [
    ["Variante", variante(item)],
    ["Condição", CONDICOES[item.condition] ?? item.condition],
    ["Quantidade", item.quantity],
    ["Reservada", item.reservedQuantity],
    ["Disponível", item.available],
    ["Visibilidade", item.isPublic ? "Pública" : "Privada"],
  ];
}

function AcaoSecundaria({ item, ocupado, motivo, motivoId, tituloId, onApagar, onTirar }) {
  if (item.deleteBlockedBy === "LISTING_HISTORY") {
    if (item.quantity === 0) return null;
    return (
      <button
        type="button"
        className={g.secundaria}
        aria-label="Tirar da coleção"
        aria-describedby={tituloId}
        title="Tirar da coleção"
        disabled={ocupado}
        onClick={() => onTirar(item)}
      >
        <PackageMinus size={18} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={g.secundaria}
      aria-label="Apagar"
      aria-describedby={motivo ? motivoId : tituloId}
      title={motivo ? `Não dá para apagar: ${motivo.toLowerCase()}` : "Apagar da coleção"}
      disabled={ocupado || Boolean(motivo)}
      onClick={() => onApagar(item)}
    >
      <Trash2 size={18} aria-hidden="true" />
    </button>
  );
}

export default function CartaColecao({ item, ocupado = false, onEditar, onAnunciar, onApagar, onTirar }) {
  const tituloId = useId();
  const motivoId = useId();
  const { card } = item;
  const destino = `/cards/${encodeURIComponent(item.cardId)}`;
  const motivo = motivoDeNaoApagar(item.deleteBlockedBy);
  const foraDaColecao = item.deleteBlockedBy === "LISTING_HISTORY" && item.quantity === 0;

  return (
    <article className={g.cartao} aria-labelledby={tituloId} data-cy="item-colecao">
      <CartaCard carta={{ ...card, illustrator: null }} link={destino} detalhes={detalhesDoItem(item)} />
      <div className={g.topo}>
        <div className={legenda.legenda}>
          {!item.isPublic && (
            <div className={legenda.selos}>
              <span className={g.selo}>Privada</span>
            </div>
          )}
          <h2 id={tituloId} className={g.nome}>
            <Link to={destino} className={legenda.nome}>
              {card.name}
            </Link>
          </h2>
          <span className={legenda.suave}>
            {variante(item)} · {CONDICOES[item.condition] ?? item.condition}
          </span>
          <span className={legenda.suave}>
            {plural(item.quantity, "cópia", "cópias")} · {plural(item.available, "disponível", "disponíveis")}
          </span>
          {motivo && (
            <p id={motivoId} className={g.nota}>
              {motivo}
              {item.deleteBlockedBy === "OPEN_LISTING" && (
                <>
                  {" · "}
                  <Link to="/anuncios">Ver anúncios</Link>
                </>
              )}
            </p>
          )}
          {foraDaColecao && <p className={g.nota}>Fora da coleção; fica no histórico de anúncios.</p>}
        </div>
        <AcaoSecundaria
          item={item}
          ocupado={ocupado}
          motivo={motivo}
          motivoId={motivoId}
          tituloId={tituloId}
          onApagar={onApagar}
          onTirar={onTirar}
        />
      </div>
      <div className={`${botoes.acoes} ${g.acoes}`}>
        <button type="button" className={botoes.botao} aria-label={`Editar ${card.name}`} onClick={() => onEditar(item)}>
          <Pencil size={18} aria-hidden="true" />
          <span aria-hidden="true">Editar</span>
        </button>
        {item.available > 0 && (
          <button type="button" className={botoes.botao} aria-describedby={tituloId} onClick={() => onAnunciar(item)}>
            <Megaphone size={18} aria-hidden="true" />
            Anunciar
          </button>
        )}
      </div>
    </article>
  );
}
