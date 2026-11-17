import { X } from "lucide-react";
import s from "../../styles/vitrine.module.css";

export default function SelosFiltro({ selos, onRemover, onLimpar }) {
  if (selos.length === 0) return null;

  return (
    <div className={s.chips} aria-label="Filtros ativos">
      {selos.map((selo) => (
        <button
          key={selo.campo}
          type="button"
          onClick={() => onRemover(selo.campo)}
          aria-label={`Remover filtro ${selo.rotulo}`}
        >
          {selo.rotulo} <X size={14} aria-hidden="true" />
        </button>
      ))}
      {selos.length > 1 && (
        <button type="button" className={s.limparChips} onClick={onLimpar}>
          Limpar tudo
        </button>
      )}
    </div>
  );
}
