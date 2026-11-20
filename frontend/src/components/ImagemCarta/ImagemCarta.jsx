import { useState } from "react";
import placeholderCarta from "../../assets/placeholders/carta-placeholder.webp";
import styles from "./ImagemCarta.module.css";

function ImagemComFallback({ src, alt, className, loading, resto }) {
  const [erro, setErro] = useState(false);
  if (erro) {
    return (
      <div
        className={`${className ?? ""} ${styles.semImagem}`}
        role="img"
        aria-label={alt}
        style={{ backgroundImage: `url(${placeholderCarta})` }}
      >
        <span className={styles.legenda}>{alt}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      {...resto}
      onError={() => setErro(true)}
    />
  );
}

export default function ImagemCarta({ src, alt, className, loading = "lazy", ...resto }) {
  const descricao = alt || "Carta Pokémon";

  if (!src) {
    return (
      <div
        className={`${className ?? ""} ${styles.semImagem}`}
        role="img"
        aria-label={descricao}
        style={{ backgroundImage: `url(${placeholderCarta})` }}
      >
        <span className={styles.legenda}>{descricao}</span>
      </div>
    );
  }

  return (
    <ImagemComFallback
      key={src}
      src={src}
      alt={descricao}
      className={className}
      loading={loading}
      resto={resto}
    />
  );
}
