import { Check, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import styles from "./AcoesRapidas.module.css";

export default function AcoesRapidas({ nome, naWishlist = false, tenho = false, ocupado = false, bloqueado = false, visualCatalogo = false, onQuero, onTenho, onEditar }) {
  if (tenho) return <div className={styles.acoes}><button type="button" className={`${styles.botao} ${styles.largo} ${visualCatalogo ? styles.editarCatalogo : ""}`} aria-label={`Editar ${nome}`} disabled={ocupado || bloqueado} onClick={onEditar}>{visualCatalogo && <Pencil size={18} aria-hidden="true" />}<span>Editar</span></button></div>;
  const tituloQuero = tenho ? "Você já tem esta carta" : naWishlist ? `Remover ${nome} da wishlist` : `Adicionar ${nome} à wishlist`;
  const tituloTenho = tenho ? `Adicionar outra versão de ${nome} à coleção` : `Tenho ${nome}: adicionar à coleção`;

  return (
    <div className={styles.acoes}>
      <button
        type="button"
        className={`${styles.botao} ${naWishlist ? styles.removerWishlist : ""}`}
        aria-label={tituloQuero}
        title={tituloQuero}
        aria-pressed={naWishlist}
        aria-busy={ocupado || undefined}
        disabled={tenho || ocupado || bloqueado}
        onClick={onQuero}
      >
        {naWishlist ? <Trash2 size={18} aria-hidden="true" /> : <Heart size={18} aria-hidden="true" />}
        <span aria-hidden="true">Wishlist</span>
      </button>
      <button type="button" className={`${styles.botao} ${visualCatalogo ? styles.tenhoCatalogo : ""}`} aria-label={tituloTenho} title={tituloTenho} disabled={bloqueado} onClick={onTenho}>
        {tenho ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        <span aria-hidden="true">Tenho</span>
      </button>
    </div>
  );
}
