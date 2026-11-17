import s from "../../styles/detalheCarta.module.css";
import { CONDICOES, variante } from "../../utils/rotulos";
import CartaCard from "../CartaCard/CartaCard";

export default function CartasOferecidas({ itens, escolhidas, onAlternar, onQuantidade }) {
  const limite = Object.keys(escolhidas).length >= 20;
  return (
    <ul className={s.cartasSelecao}>
      {itens.map((item) => {
        const selecionada = item.id in escolhidas;
        return (
          <li className={s.itemSelecao} data-selecionada={selecionada} key={item.id}>
            <label className={s.marcarCarta}>
              <span>{selecionada ? "Selecionada para troca" : "Selecionar para troca"}</span>
              <input type="checkbox" aria-label={`Oferecer ${item.card.name}`} checked={selecionada} disabled={!selecionada && limite} onChange={(e) => onAlternar(item, e.target.checked)} />
            </label>
            <div className={s.cartaSelecaoInfo}>
              <div className={s.imagemSelecao}><CartaCard carta={item.card} painel={false} /></div>
              <div className={s.dadosSelecao}>
                <strong>{item.card.name}</strong>
                <p className={s.suave}>{item.card.setName} · {item.card.number}</p>
                <div className={s.badges}><span className={s.badge}>{variante(item)}</span><span className={s.badge}>{CONDICOES[item.condition]}</span></div>
              </div>
            </div>
            <div className={s.quantidadeSelecao}>
              <label className={s.campo}>
                Quantidade a oferecer
                <input aria-label={`Quantidade de ${item.card.name} oferecida`} type="number" min="1" max={item.available} required={selecionada} disabled={!selecionada} value={selecionada ? escolhidas[item.id] : ""} placeholder="—" onChange={(e) => onQuantidade(item, e.target.value)} />
              </label>
              <span className={s.suave}>{item.available} {item.available === 1 ? "disponível" : "disponíveis"}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
