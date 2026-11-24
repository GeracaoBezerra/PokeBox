import { useId } from "react";
import { Plus } from "lucide-react";
import blastoise from "../../assets/cards/blastoise.webp";
import charizard from "../../assets/cards/charizard.webp";
import cartao from "../ItemWishlist/ItemWishlist.module.css";
import s from "./CartaoAdicionar.module.css";

export default function CartaoAdicionar({ botaoRef, titulo, instrucao, ...props }) {
  const instrucaoId = useId();

  return (
    <button
      ref={botaoRef}
      type="button"
      className={`${cartao.item} ${s.adicionar}`}
      aria-label={titulo}
      aria-describedby={instrucaoId}
      {...props}
    >
      <span className={s.arte} aria-hidden="true">
        <span className={`${s.figura} ${s.figuraSuperior}`}><img src={charizard} alt="" /></span>
        <span className={`${s.figura} ${s.figuraInferior}`}><img src={blastoise} alt="" /></span>
        <span className={s.maisArte}><Plus size={32} /></span>
      </span>
      <span className={cartao.painel}>
        <span className={cartao.identidade}>
          <span className={cartao.nome}>{titulo}</span>
          <span id={instrucaoId} className={s.instrucao}>{instrucao}</span>
        </span>
      </span>
    </button>
  );
}
