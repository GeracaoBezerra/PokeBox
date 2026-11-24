import s from "../../styles/paginas.module.css";
import { chaveDoItem } from "../../utils/colecao";
import LinhaColecao from "../LinhaColecao/LinhaColecao";

export default function TabelaColecao({ itens, ocupado, onMudou, onAnunciar, onApagar, onTirar }) {
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <caption className={s.somenteLeitor}>Cartas da sua coleção</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className={s.somenteLeitor}>Imagem</span>
            </th>
            <th scope="col">Carta</th>
            <th scope="col">Variante</th>
            <th scope="col">Condição</th>
            <th scope="col">Quantidade</th>
            <th scope="col">Reservada</th>
            <th scope="col">Disponível</th>
            <th scope="col">Pública</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <LinhaColecao
              key={chaveDoItem(item)}
              item={item}
              ocupado={ocupado}
              onMudou={onMudou}
              onAnunciar={onAnunciar}
              onApagar={onApagar}
              onTirar={onTirar}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
