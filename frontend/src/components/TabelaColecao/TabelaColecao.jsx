import s from "../../styles/paginas.module.css";
import LinhaColecao from "../LinhaColecao/LinhaColecao";

export default function TabelaColecao({ itens, onMudou }) {
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th />
            <th>Carta</th>
            <th>Variante</th>
            <th>Condição</th>
            <th>Quantidade</th>
            <th>Reservada</th>
            <th>Disponível</th>
            <th>Pública</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <LinhaColecao key={item.id} item={item} onMudou={onMudou} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
