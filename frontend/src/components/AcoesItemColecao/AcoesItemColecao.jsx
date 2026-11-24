import { useId } from "react";
import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import { motivoDeNaoApagar } from "../../utils/colecao";
import a from "./AcoesItemColecao.module.css";

export default function AcoesItemColecao({ item, ocupado = false, onEditar, onAnunciar, onApagar, onTirar }) {
  const motivoId = useId();
  const nome = item.card.name;
  const motivo = motivoDeNaoApagar(item.deleteBlockedBy);
  const historico = item.deleteBlockedBy === "LISTING_HISTORY";

  return (
    <div className={a.acoes}>
      <div className={s.acoes}>
        {onEditar && (
          <button type="button" className={s.botaoSecundario} aria-label={`Editar ${nome}`} onClick={() => onEditar(item)}>
            Editar
          </button>
        )}
        {item.available > 0 && (
          <button type="button" className={s.botaoSecundario} onClick={() => onAnunciar(item)}>
            Anunciar
          </button>
        )}
        {historico && item.quantity > 0 && (
          <button type="button" className={s.botaoPerigo} onClick={() => onTirar(item)} disabled={ocupado}>
            Tirar da coleção
          </button>
        )}
        {!historico && (
          <button
            type="button"
            className={s.botaoPerigo}
            onClick={() => onApagar(item)}
            disabled={ocupado || Boolean(motivo)}
            aria-describedby={motivo ? motivoId : undefined}
          >
            Apagar
          </button>
        )}
      </div>
      {motivo && (
        <p id={motivoId} className={a.motivo}>
          {motivo}
          {item.deleteBlockedBy === "OPEN_LISTING" && (
            <>
              {" · "}
              <Link className={s.link} to="/anuncios">
                Ver anúncios
              </Link>
            </>
          )}
        </p>
      )}
      {historico && item.quantity === 0 && <p className={a.motivo}>Fora da coleção; fica no histórico de anúncios.</p>}
    </div>
  );
}
