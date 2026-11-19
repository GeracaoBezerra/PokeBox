import s from "../../styles/paginas.module.css";

const ABAS = { recebidas: "Recebidas", enviadas: "Enviadas" };

export default function AbasNegociacao({ aba, onAba, status, onStatus, rotulosStatus }) {
  return (
    <div className={s.abas}>
      {Object.entries(ABAS).map(([valor, rotulo]) => (
        <button key={valor} className={aba === valor ? s.abaAtiva : s.aba} onClick={() => onAba(valor)}>
          {rotulo}
        </button>
      ))}
      <label className={s.campo}>
        <select value={status} onChange={(e) => onStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {Object.entries(rotulosStatus).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
