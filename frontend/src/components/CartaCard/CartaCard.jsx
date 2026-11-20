import { Link } from "react-router-dom";

import ImagemCarta from "../ImagemCarta/ImagemCarta";
import styles from "./CartaCard.module.css";

// A API devolve o tipo em inglês ("Fire"); o global.css usa chaves em português
// (data-tipo="fogo"). Cada tipo traz a chave do CSS e o texto que aparece.
const TIPOS = {
  colorless: { chave: "incolor", rotulo: "Incolor" },
  darkness: { chave: "sombrio", rotulo: "Sombrio" },
  dragon: { chave: "dragao", rotulo: "Dragão" },
  fairy: { chave: "fada", rotulo: "Fada" },
  fighting: { chave: "lutador", rotulo: "Lutador" },
  fire: { chave: "fogo", rotulo: "Fogo" },
  grass: { chave: "planta", rotulo: "Planta" },
  lightning: { chave: "eletrico", rotulo: "Elétrico" },
  metal: { chave: "metal", rotulo: "Metal" },
  psychic: { chave: "psiquico", rotulo: "Psíquico" },
  water: { chave: "agua", rotulo: "Água" },
};

function acharTipo(nome) {
  if (!nome) return undefined;
  const chave = nome.toLowerCase();
  return TIPOS[chave] ?? Object.values(TIPOS).find((tipo) => tipo.rotulo.toLowerCase() === chave);
}

// Uma linha "rótulo → valor" do painel de dados.
function Linha({ rotulo, children }) {
  return (
    <div className={styles.linha}>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Carta do catálogo + painel de dados que abre ao lado dela no hover ou no
// foco por teclado. O lado em que o painel abre vem da variável CSS --lado,
// definida por quem renderiza o card (veja o GradeCartas).
//
// Recebe a carta exatamente como a API devolve. Os campos que ela traz são:
//   GET /cards      → id, name, number, set.name, image.small
//   GET /cards/:id  → os de cima + rarity, illustrator, types
//   coleção, wishlist, anúncios, trocas (StoredCard) → o mesmo, mas com
//   imageUrl e setName no lugar de image.small e set.name
// O que não vier simplesmente não aparece no painel.
//
// lang: idioma da carta, vai na URL do detalhe (/cards/:id?lang=pt).
// link: use só se o destino for outro.
// painel: passe false para esconder o painel (por exemplo, enquanto os dados
// completos da carta ainda não chegaram).
export default function CartaCard({ carta, lang, link, painel = true, acoes }) {
  const { id, name: nome, rarity: raridade, illustrator: artista, types } = carta;

  const src = carta.image?.small ?? carta.imageUrl ?? null;
  const set = carta.set?.name ?? carta.setName ?? null;
  const numero = carta.number ?? carta.localId;
  const numeroTexto = numero ? `Nº ${numero}` : null;

  const tipoApi = types?.[0];
  const tipoInfo = acharTipo(tipoApi);
  const tipo = tipoInfo?.rotulo ?? tipoApi;

  const idUrl = encodeURIComponent(id);
  const destino = link ?? (lang ? `/cards/${idUrl}?lang=${lang}` : `/cards/${idUrl}`);
  const alt = [nome, set, numeroTexto].filter(Boolean).join(", ");
  const temDados = Boolean(tipo || raridade || set || numeroTexto || artista);

  return (
    // Sem tipo, usa o "incolor" (cinza neutro) para o painel manter fundo e borda
    <div className={styles.carta} data-tipo={tipoInfo?.chave ?? "incolor"}>
      <div className={styles.palco}>
        <Link to={destino} className={styles.link}>
          <ImagemCarta
            className={styles.imagem}
            src={src}
            alt={alt}
            width="245"
            height="342"
            decoding="async"
            draggable={false}
          />
        </Link>

        {/* Painel de dados: é só um resumo visual, os mesmos dados estarão
            na página da carta. */}
        {painel && temDados && (
          <div className={styles.painel} aria-hidden="true">
            <p className={styles.nome}>{nome}</p>

            <dl className={styles.lista}>
              {tipo && (
                <Linha rotulo="Tipo">
                  <span className={styles.tipo}>{tipo}</span>
                </Linha>
              )}
              {raridade && <Linha rotulo="Raridade">{raridade}</Linha>}
              {set && <Linha rotulo="Set">{set}</Linha>}
              {numeroTexto && <Linha rotulo="Número">{numeroTexto}</Linha>}
              {artista && <Linha rotulo="Artista">{artista}</Linha>}
            </dl>
          </div>
        )}
      </div>
      {acoes}
    </div>
  );
}
