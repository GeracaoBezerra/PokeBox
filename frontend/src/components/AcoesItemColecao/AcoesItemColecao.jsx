import { Check, Megaphone, PackageMinus, Trash2 } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router-dom";
import s from "../../styles/paginas.module.css";
import { motivoDeNaoApagar } from "../../utils/colecao";
import a from "./AcoesItemColecao.module.css";

function BotaoIcone({ rotulo, icone: Icone, variante = "", ...resto }) {
  return (
    <button type="button" className={`${a.icone} ${variante}`} aria-label={rotulo} title={rotulo} {...resto}>
      <Icone size={18} aria-hidden="true" />
    </button>
  );
}

export default function AcoesItemColecao({ item, ocupado = false, podeSalvar = false, onSalvar, onAnunciar, onApagar, onTirar }) {
  const motivoId = useId();
  const motivo = motivoDeNaoApagar(item.deleteBlockedBy);
  const historico = item.deleteBlockedBy === "LISTING_HISTORY";

  return (
    <div className={a.acoes}>
      <div className={a.linha}>
        {onSalvar && (
          <BotaoIcone
            rotulo="Salvar"
            icone={Check}
            variante={podeSalvar ? a.salvar : ""}
            onClick={onSalvar}
            disabled={!podeSalvar || ocupado}
          />
        )}
        {item.livre > 0 && <BotaoIcone rotulo="Anunciar" icone={Megaphone} onClick={() => onAnunciar(item)} />}
        {historico && item.quantity > 0 && (
          <BotaoIcone rotulo="Tirar da coleção" icone={PackageMinus} variante={a.perigo} onClick={() => onTirar(item)} disabled={ocupado} />
        )}
        {!historico && (
          <BotaoIcone
            rotulo="Apagar"
            icone={Trash2}
            variante={a.perigo}
            onClick={() => onApagar(item)}
            disabled={ocupado || Boolean(motivo)}
            aria-describedby={motivo ? motivoId : undefined}
          />
        )}
      </div>
      {motivo && (
        <p id={motivoId} className={a.motivo}>
          {motivo}
          {item.deleteBlockedBy === "OPEN_LISTING" && (
            <>
              {" · "}
              <Link className={`${s.link} ${a.semQuebra}`} to="/anuncios">
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
