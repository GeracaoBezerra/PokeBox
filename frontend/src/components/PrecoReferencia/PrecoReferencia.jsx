import s from "../../styles/detalheCarta.module.css";

export default function PrecoReferencia({ card }) {
  const preco = card.marketPrice;
  const valor = typeof preco === "object" && preco !== null ? preco.value : preco;
  const moeda = preco?.currency ?? card.marketPriceCurrency;
  const fonte = preco?.source ?? card.marketPriceSource;
  const disponivel = valor != null && moeda;
  const formatado = disponivel ? Number(valor).toLocaleString("pt-BR", { style: "currency", currency: moeda }) : null;

  return (
    <div className={s.preco}>
      <span className={s.suave}>Preço de referência</span>
      <strong>{formatado || "Ainda sem referência"}</strong>
      <p>{disponivel ? `${fonte === "tcgplayer" ? "TCGplayer" : fonte === "cardmarket" ? "Cardmarket" : "Mercado"} · ${moeda}. Valor informativo para comparar trocas.` : "O preço de mercado desta carta não está disponível."}</p>
    </div>
  );
}
