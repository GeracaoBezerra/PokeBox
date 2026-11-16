import s from "../../styles/paginas.module.css";

export default function Paginacao({ pagina, temProxima, onIrPara }) {
  return (
    <div className={s.paginacao}>
      <button className={s.botaoSecundario} disabled={pagina <= 1} onClick={() => onIrPara(pagina - 1)}>
        Anterior
      </button>
      <span className={s.suave}>Página {pagina}</span>
      <button className={s.botaoSecundario} disabled={!temProxima} onClick={() => onIrPara(pagina + 1)}>
        Próxima
      </button>
    </div>
  );
}
