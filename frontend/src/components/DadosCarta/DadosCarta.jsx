import s from "../../styles/paginas.module.css";

function formatarPreco(preco) {
  if (!preco) return "Sem preço de referência";
  const valor = preco.value.toLocaleString("pt-BR", { style: "currency", currency: preco.currency });
  return `${valor} (${preco.source === "tcgplayer" ? "TCGplayer" : "Cardmarket"})`;
}

function Dado({ rotulo, children }) {
  return (
    <>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </>
  );
}

export default function DadosCarta({ card }) {
  const variantes = Object.entries(card.variants ?? {})
    .filter(([, tem]) => tem)
    .map(([nome]) => nome)
    .join(", ");

  return (
    <>
      <h1 className={s.titulo}>{card.name}</h1>
      <p className={s.subtitulo}>
        {card.set?.name} · {card.number} · <code>{card.id}</code>
      </p>

      <dl className={s.lista}>
        <Dado rotulo="Categoria">{card.category}</Dado>
        {card.rarity && <Dado rotulo="Raridade">{card.rarity}</Dado>}
        {card.hp && <Dado rotulo="HP">{card.hp}</Dado>}
        {card.types?.length > 0 && <Dado rotulo="Tipo">{card.types.join(", ")}</Dado>}
        {card.illustrator && <Dado rotulo="Ilustrador">{card.illustrator}</Dado>}
        <Dado rotulo="Variantes">{variantes || "—"}</Dado>
        <Dado rotulo="Preço de referência">{formatarPreco(card.marketPrice)}</Dado>
      </dl>

      {card.attacks?.length > 0 && (
        <div className={s.secao}>
          <h2>Ataques</h2>
          <ul>
            {card.attacks.map((ataque) => (
              <li key={ataque.name}>
                <strong>{ataque.name}</strong> {ataque.damage && `· ${ataque.damage}`}
                {ataque.effect && <p className={s.suave}>{ataque.effect}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
