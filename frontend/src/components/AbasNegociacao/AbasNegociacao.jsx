import s from "../../styles/paginas.module.css";
import Abas from "../Abas/Abas";

const ABAS = [
  { valor: "recebidas", rotulo: "Recebidas" },
  { valor: "enviadas", rotulo: "Enviadas" },
];

export default function AbasNegociacao({ rotulo, idPainel, aba, onAba, status, onStatus, rotulosStatus }) {
  return (
    <div className={s.abas}>
      <Abas rotulo={rotulo} abas={ABAS} selecionada={aba} onSelecionar={onAba} idPainel={idPainel} />
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
