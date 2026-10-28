import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import styles from "./GridCartas.module.css";

// DADOS DE EXEMPLO. Quando o backend existir, estes campos vêm da API:
// nome, set, numero, raridade, artista (illustrator) e tipo vêm da TCGdex;
// wishlist e ranking vêm do banco (contagem de wishlist_items por carta).
// Imagens: padrão https://assets.tcgdex.net/en/<serie>/<set>/<numero>/high.webp
// (ou importe arquivos locais de assets/cards/, como no BannerSwiper).
const cartas = [
  {
    id: "base3-5",
    nome: "Gengar",
    set: "Fossil",
    numero: "5/62",
    raridade: "Rara Holo",
    artista: "Keiji Kinebuchi",
    tipo: "Psíquico",
    tipoKey: "psiquico",
    wishlist: 3120,
    ranking: 1,
    src: "https://assets.tcgdex.net/en/base/base3/5/high.webp",
  },
  {
    id: "base3-4",
    nome: "Dragonite",
    set: "Fossil",
    numero: "4/62",
    raridade: "Rara Holo",
    artista: "Mitsuhiro Arita",
    tipo: "Incolor",
    tipoKey: "incolor",
    wishlist: 2874,
    ranking: 2,
    src: "https://assets.tcgdex.net/en/base/base3/4/high.webp",
  },
  {
    id: "base1-12",
    nome: "Ninetales",
    set: "Base Set",
    numero: "12/102",
    raridade: "Rara Holo",
    artista: "Ken Sugimori",
    tipo: "Fogo",
    tipoKey: "fogo",
    wishlist: 2455,
    ranking: 3,
    src: "https://assets.tcgdex.net/en/base/base1/12/high.webp",
  },
  {
    id: "base1-14",
    nome: "Raichu",
    set: "Base Set",
    numero: "14/102",
    raridade: "Rara Holo",
    artista: "Mitsuhiro Arita",
    tipo: "Elétrico",
    tipoKey: "eletrico",
    wishlist: 2210,
    ranking: 4,
    src: "https://assets.tcgdex.net/en/base/base1/14/high.webp",
  },
  {
    id: "base3-10",
    nome: "Lapras",
    set: "Fossil",
    numero: "10/62",
    raridade: "Rara Holo",
    artista: "Mitsuhiro Arita",
    tipo: "Água",
    tipoKey: "agua",
    wishlist: 1986,
    ranking: 5,
    src: "https://assets.tcgdex.net/en/base/base3/10/high.webp",
  },
  {
    id: "base1-1",
    nome: "Alakazam",
    set: "Base Set",
    numero: "1/102",
    raridade: "Rara Holo",
    artista: "Ken Sugimori",
    tipo: "Psíquico",
    tipoKey: "psiquico",
    wishlist: 1742,
    ranking: 6,
    src: "https://assets.tcgdex.net/en/base/base1/1/high.webp",
  },
  {
    id: "base3-12",
    nome: "Moltres",
    set: "Fossil",
    numero: "12/62",
    raridade: "Rara Holo",
    artista: "Mitsuhiro Arita",
    tipo: "Fogo",
    tipoKey: "fogo",
    wishlist: 1530,
    ranking: 7,
    src: "https://assets.tcgdex.net/en/base/base3/12/high.webp",
  },
  {
    id: "base3-2",
    nome: "Articuno",
    set: "Fossil",
    numero: "2/62",
    raridade: "Rara Holo",
    artista: "Mitsuhiro Arita",
    tipo: "Água",
    tipoKey: "agua",
    wishlist: 1288,
    ranking: 8,
    src: "https://assets.tcgdex.net/en/base/base3/2/high.webp",
  },
  {
    id: "base1-11",
    nome: "Nidoking",
    set: "Base Set",
    numero: "11/102",
    raridade: "Rara Holo",
    artista: "Ken Sugimori",
    tipo: "Planta",
    tipoKey: "planta",
    wishlist: 1104,
    ranking: 9,
    src: "https://assets.tcgdex.net/en/base/base1/11/high.webp",
  },
  {
    id: "base1-8",
    nome: "Machamp",
    set: "Base Set",
    numero: "8/102",
    raridade: "Rara Holo",
    artista: "Ken Sugimori",
    tipo: "Lutador",
    tipoKey: "lutador",
    wishlist: 897,
    ranking: 10,
    src: "https://assets.tcgdex.net/en/base/base1/8/high.webp",
  },
  {
    id: "base1-13",
    nome: "Poliwrath",
    set: "Base Set",
    numero: "13/102",
    raridade: "Rara Holo",
    artista: "Ken Sugimori",
    tipo: "Água",
    tipoKey: "agua",
    wishlist: 764,
    ranking: 11,
    src: "https://assets.tcgdex.net/en/base/base1/13/high.webp",
  },
  {
    id: "base1-7",
    nome: "Hitmonchan",
    set: "Base Set",
    numero: "7/102",
    raridade: "Rara Holo",
    artista: "Ken Sugimori",
    tipo: "Lutador",
    tipoKey: "lutador",
    wishlist: 620,
    ranking: 12,
    src: "https://assets.tcgdex.net/en/base/base1/7/high.webp",
  },
];

export default function GridCartas() {
  return (
    <section className={styles.secao} aria-labelledby="grid-cartas-titulo">
      <div className={styles.container}>
        <header className={styles.cabecalho}>
          <h2 id="grid-cartas-titulo" className={styles.titulo}>
            Cartas em destaque
          </h2>

          {/* TODO: trocar por "/cards" quando a rota existir */}
          <Link to="/" className={styles.verTodas}>
            Ver todas
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <ul className={styles.grade} role="list">
          {cartas.map((carta) => (
            <li key={carta.id} className={styles.item}>
              <div className={styles.palco}>
                {/* TODO: criar a rota /cards/:id */}
                <Link to={`/cards/${carta.id}`} className={styles.link}>
                  <img
                    className={styles.imagem}
                    src={carta.src}
                    alt={`${carta.nome}, ${carta.set} ${carta.numero}`}
                    width="245"
                    height="342"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </Link>

                {/* Painel de dados: abre colado na lateral da carta no hover
                    ou no foco por teclado. É só um resumo visual: os mesmos
                    dados estarão na página da carta. */}
                <div className={styles.painel} aria-hidden="true">
                  <p className={styles.nome}>{carta.nome}</p>

                  <dl className={styles.lista}>
                    <div className={styles.linha}>
                      <dt>Tipo</dt>
                      <dd>
                        <span className={styles.tipo} data-tipo={carta.tipoKey}>
                          {carta.tipo}
                        </span>
                      </dd>
                    </div>

                    <div className={styles.linha}>
                      <dt>Raridade</dt>
                      <dd>{carta.raridade}</dd>
                    </div>

                    <div className={styles.linha}>
                      <dt>Set</dt>
                      <dd>
                        {carta.set} · {carta.numero}
                      </dd>
                    </div>

                    <div className={styles.linha}>
                      <dt>Artista</dt>
                      <dd>{carta.artista}</dd>
                    </div>

                    <div className={styles.linha}>
                      <dt>Wishlists</dt>
                      <dd className="dados">
                        {carta.wishlist.toLocaleString("pt-BR")}
                      </dd>
                    </div>

                    <div className={styles.linha}>
                      <dt>Ranking</dt>
                      <dd className={`dados ${styles.ranking}`}>
                        #{carta.ranking}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}