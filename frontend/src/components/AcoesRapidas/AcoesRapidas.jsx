import { Check, Heart, Plus } from "lucide-react";
import styles from "./AcoesRapidas.module.css";

export default function AcoesRapidas({ nome, naWishlist = false, tenho = false, ocupado = false, onQuero, onTenho }) {
  const tituloQuero = tenho ? "Você já tem esta carta" : naWishlist ? `Tirar ${nome} da wishlist` : `Quero ${nome}`;
  const tituloTenho = tenho ? `Adicionar outra versão de ${nome} à coleção` : `Tenho ${nome}: adicionar à coleção`;

  return (
    <div className={styles.acoes}>
      <button
        type="button"
        className={styles.botao}
        aria-label={tituloQuero}
        title={tituloQuero}
        aria-pressed={naWishlist}
        aria-busy={ocupado || undefined}
        disabled={tenho || ocupado}
        onClick={onQuero}
      >
        <Heart size={18} aria-hidden="true" fill={naWishlist ? "currentColor" : "none"} />
        <span aria-hidden="true">Quero</span>
      </button>
      <button type="button" className={styles.botao} aria-label={tituloTenho} title={tituloTenho} onClick={onTenho}>
        {tenho ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        <span aria-hidden="true">Tenho</span>
      </button>
    </div>
  );
}
