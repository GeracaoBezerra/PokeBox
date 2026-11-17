import { Layers } from "lucide-react";
import CartaInterativa from "../CartaInterativa/CartaInterativa";
import DecoracaoTipos from "../DecoracaoTipos/DecoracaoTipos";
import SkeletonCard from "../SkeletonCard/SkeletonCard";
import s from "../../styles/detalheCarta.module.css";

// Aceita tanto o detalhe do catálogo quanto o snapshot guardado nos anúncios.
export default function PalcoCarta({ card, carregando = false }) {
  if (carregando || !card) return (
    <div className={s.palco}><div className={s.imagem}><SkeletonCard /></div></div>
  );

  return (
    <div className={s.visual}>
      <div className={s.palco}>
        <DecoracaoTipos tipos={card.types} className={s.decoracaoTipos} />
        <CartaInterativa key={card.id} card={card} />
      </div>
      <p className={s.identificador}><Layers size={14} aria-hidden="true" /> {card.set?.name ?? card.setName} <span>· {card.number}</span></p>
    </div>
  );
}
