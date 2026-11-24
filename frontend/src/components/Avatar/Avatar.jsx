import { corDoAvatar, iniciais } from "../../utils/avatar";
import styles from "./Avatar.module.css";

export default function Avatar({ nome, username }) {
  const cor = corDoAvatar(username);
  return (
    <span
      className={styles.avatar}
      style={{ backgroundColor: cor.fundo, color: cor.texto }}
      aria-hidden="true"
    >
      {iniciais(nome, username)}
    </span>
  );
}
