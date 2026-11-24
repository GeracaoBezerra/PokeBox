import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, X } from "lucide-react";
import { CONDICOES, variante } from "../../utils/rotulos";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import vitrine from "../../styles/vitrine.module.css";
import s from "./LadoNegociacao.module.css";

const LIMITE_PREVIA = 2;

function Cartas({ itens, className }) {
  return (
    <ul className={className} role="list">
      {itens.map((item, indice) => (
        <li className={s.carta} key={`${item.collectionItemId ?? item.card.id}-${indice}`}>
          <Link className={s.miniatura} to={`/cards/${item.card.id}`}>
            <ImagemCarta className={s.imagem} src={item.card.image?.large ?? item.card.image?.small ?? item.card.imageUrl} alt={item.card.name} />
          </Link>
          <div className={s.infoCarta}>
            <div className={s.linhaNome}>
              <p className={s.nomeCarta}>{item.card.name}</p>
              <span className={s.quantidade}>{item.quantity}×</span>
            </div>
            {item.card.setName && <p className={s.detalhes}>{item.card.setName}</p>}
            <p className={s.detalhes}>{variante(item)} · {CONDICOES[item.condition]}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function LadoNegociacao({ titulo, itens }) {
  const dialogo = useRef(null);
  const tituloGaleria = useId();
  const [aberto, setAberto] = useState(false);

  return (
    <section className={s.lado} aria-label={titulo}>
      <h3>{titulo}</h3>
      {itens.length > 0
        ? <Cartas className={s.previa} itens={itens.slice(0, LIMITE_PREVIA)} />
        : <p className={s.detalhes}>Cartas não registradas.</p>}
      {itens.length > 1 && (
        <>
          <button type="button" className={s.verPacote} data-so-compacto={itens.length <= LIMITE_PREVIA}
            aria-haspopup="dialog" onClick={() => {
              setAberto(true);
              dialogo.current.showModal();
            }}
          >
            <Layers size={16} aria-hidden="true" /> Ver as {itens.length} cartas
          </button>
          <dialog ref={dialogo} className={`${vitrine.modalFiltros} ${s.galeria}`} aria-labelledby={tituloGaleria}
            onClose={() => setAberto(false)}
            onClick={(evento) => { if (evento.target === evento.currentTarget) dialogo.current.close(); }}
          >
            <header className={vitrine.modalCabecalho}>
              <h2 id={tituloGaleria}>{titulo} · {itens.length} cartas</h2>
              <button type="button" className={vitrine.fecharModal} aria-label="Fechar galeria" onClick={() => dialogo.current.close()}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            {aberto && <div className={vitrine.modalConteudo}><Cartas className={s.cartasGaleria} itens={itens} /></div>}
          </dialog>
        </>
      )}
    </section>
  );
}
