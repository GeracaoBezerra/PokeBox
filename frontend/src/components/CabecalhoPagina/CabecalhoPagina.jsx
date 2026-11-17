import s from "../../styles/paginas.module.css";

export default function CabecalhoPagina({ titulo, children }) {
  return (
    <>
      <h1 className={s.titulo}>{titulo}</h1>
      {children && <p className={s.subtitulo}>{children}</p>}
    </>
  );
}
