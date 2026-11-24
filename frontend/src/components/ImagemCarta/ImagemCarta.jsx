import { useState } from "react";
import placeholderCarta from "../../assets/placeholders/carta-placeholder.webp";
import styles from "./ImagemCarta.module.css";

function Placeholder({ className, descricao }) {
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

function ImagemComFallback({ src, alt, className, loading, resto }) {
  const [erro, setErro] = useState(false);
  if (erro) {
    return <Placeholder className={className} descricao={alt} />;
  }

  return (
    <img
      className={`${styles.imagem} ${className ?? ""}`}
      src={src}
      alt={alt}
      loading={loading}
      width={245}
      height={342}
      decoding="async"
      {...resto}
      onError={() => setErro(true)}
    />
  );
}

export default function ImagemCarta({ src, alt, className, loading = "lazy", ...resto }) {
  const descricao = alt || "Carta Pokémon";

  if (!src) {
    return <Placeholder className={className} descricao={descricao} />;
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
