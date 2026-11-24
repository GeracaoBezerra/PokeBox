import s from "./Atualizando.module.css";

export default function Atualizando({ atualizando = false, children }) {
  return (
    <div className={s.area} aria-busy={atualizando}>
      {children}
    </div>
  );
}
