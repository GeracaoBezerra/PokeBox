import styles from "./ImagemCarta.module.css";

export default function ImagemCarta({ src, alt, className }) {
  if (!src) {
    return (
      <div className={`${className ?? ""} ${styles.semImagem}`} role="img" aria-label={alt}>
        <span>{alt}</span>
      </div>
    );
  }

  return <img className={className} src={src} alt={alt} loading="lazy" />;
}
