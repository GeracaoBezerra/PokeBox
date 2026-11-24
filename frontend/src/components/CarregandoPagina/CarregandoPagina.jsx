import s from "./CarregandoPagina.module.css";

export default function CarregandoPagina() {
  return (
    <div className={s.area} role="status" aria-label="Carregando página" aria-busy="true">
      <span className={s.giro} aria-hidden="true" />
    </div>
  );
}
