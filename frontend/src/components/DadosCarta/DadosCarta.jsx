import s from "../../styles/detalheCarta.module.css";
import PrecoReferencia from "../PrecoReferencia/PrecoReferencia";

const VARIANTES = { normal: "Normal", holo: "Holo", reverse: "Reverse", firstEdition: "1ª edição" };

export default function DadosCarta({ card }) {
  return (
    <>
      <header className={s.cabecalhoCarta}>
        <span className={s.eyebrow}>{card.set?.name || "Pokémon TCG"}</span>
        <h1>{card.name}</h1>
        <div className={s.badges}>
          <span className={s.numero}>Nº {card.number}</span>
          {card.rarity && <span className={s.badgeDourado}>{card.rarity}</span>}
          {card.types?.map((tipo) => <span className={s.badge} key={tipo}>{tipo}</span>)}
          {card.hp != null && <span className={s.badge}>{card.hp} HP</span>}
        </div>
      </header>
      <PrecoReferencia card={card} />
      {Object.entries(card.variants ?? {}).some(([, tem]) => tem) && (
        <div className={s.variantes}>
          <span className={s.suave}>Versões disponíveis</span>
          <div className={s.badges}>{Object.entries(VARIANTES).filter(([key]) => card.variants[key]).map(([key, nome]) => <span className={s.badge} key={key}>{nome}</span>)}</div>
        </div>
      )}
    </>
  );
}
