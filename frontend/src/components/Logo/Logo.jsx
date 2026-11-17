import completa from "../../assets/logo/logo-completa.webp";
import simbolo from "../../assets/logo/logo-simbolo.webp";
import styles from "./Logo.module.css";

export default function Logo({
  variante = "completa",
  tamanho = 32,
  decorativa = false,
}) {
  const src = variante === "simbolo" ? simbolo : completa;

  return (
    <img
      className={styles.logo}
      src={src}
      height={tamanho}
      alt={decorativa ? "" : "PokeBox"}
    />
  );
}
