import s from "../../styles/paginas.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";
import ImagemCarta from "../ImagemCarta/ImagemCarta";

export default function CartasOferecidas({ itens, escolhidas, onAlternar, onQuantidade }) {
  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Oferecer ${item.card.name}`}
                  checked={item.id in escolhidas}
                  onChange={(e) => onAlternar(item, e.target.checked)}
                />
              </td>
              <td>
                <ImagemCarta className={s.miniatura} src={item.card.imageUrl} alt={item.card.name} />
              </td>
              <td>
                {item.card.name}
                <div className={s.suave}>
                  {variante(item)} · {CONDICOES[item.condition]}
                </div>
              </td>
              <td className={s.suave}>{item.available} disponível</td>
              <td className={s.campo}>
                {item.id in escolhidas && (
                  <input
                    type="number"
                    min="1"
                    max={item.available}
                    value={escolhidas[item.id]}
                    onChange={(e) => onQuantidade(item, e.target.value)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
