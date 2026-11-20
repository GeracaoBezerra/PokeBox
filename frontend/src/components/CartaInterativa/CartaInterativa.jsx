import { useState } from "react";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import SkeletonCard from "../SkeletonCard/SkeletonCard";
import styles from "./CartaInterativa.module.css";

// O alvo do ponteiro fica parado; somente a superfície interna se inclina.
export default function CartaInterativa({ card }) {
  const [carregada, setCarregada] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const src = card.image?.large ?? card.image?.small ?? card.imageUrl;
  const set = card.set?.name ?? card.setName;
  const numero = card.number ?? card.localId;
  const alt = [card.name, set, numero ? `Nº ${numero}` : null].filter(Boolean).join(", ");

  function mover(event) {
    if (!carregada || event.pointerType !== "mouse" ||
      !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    const alvo = event.currentTarget;
    const rect = alvo.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    alvo.style.setProperty("--movimento-x", x.toFixed(3));
    alvo.style.setProperty("--movimento-y", y.toFixed(3));
    alvo.dataset.ativa = "true";
  }

  function restaurar(event) {
    const alvo = event.currentTarget;
    alvo.style.removeProperty("--movimento-x");
    alvo.style.removeProperty("--movimento-y");
    delete alvo.dataset.ativa;
  }

  if (!src || falhou) return <div className={styles.area}><ImagemCarta className={styles.imagem} alt={alt} /></div>;

  return (
    <div className={styles.area} onPointerMove={mover} onPointerLeave={restaurar} onPointerCancel={restaurar}>
      <div className={styles.superficie}>
        {!carregada && <div className={styles.esqueleto}><SkeletonCard /></div>}
        <img
          className={styles.imagem}
          data-carregada={carregada}
          src={src}
          alt={alt}
          width="630"
          height="880"
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onLoad={() => setCarregada(true)}
          onError={() => setFalhou(true)}
        />
      </div>
    </div>
  );
}
