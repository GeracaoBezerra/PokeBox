import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import styles from "./DestaquesHome.module.css";

// Imagens da TCGdex (Base Set). Troque por arquivos locais em
// assets/cards/ importando como no BannerSwiper:
// import mewtwo from "../../assets/cards/mewtwo.webp";
const destaques = [
  {
    id: 1,
    titulo: "Novas adições",
    texto: "As últimas cartas Foil, Holo e Reverse Holo anunciadas para troca.",
    to: "/", // TODO: "/marketplace?ordem=recentes"
    src: "https://assets.tcgdex.net/en/base/base1/10/high.webp",
  },
  {
    id: 2,
    titulo: "Trocas em alta",
    texto: "As cartas mais negociadas da semana.",
    to: "/", // TODO: "/marketplace?ordem=em-alta"
    src: "https://assets.tcgdex.net/en/base/base1/6/high.webp",
  },
  {
    id: 3,
    titulo: "Mais desejadas",
    texto: "Cartas que aparecem em mais wishlists.",
    to: "/", // TODO: "/cards?ordem=mais-desejadas"
    src: "https://assets.tcgdex.net/en/base/base1/16/high.webp",
  },
];

export default function DestaquesHome() {
  return (
    <section className={styles.secao} aria-labelledby="destaques-titulo">
      <div className={styles.container}>
        <h2 id="destaques-titulo" className={styles.titulo}>
          Principais novidades
        </h2>

        <div className={styles.grade}>
          {destaques.map((destaque) => (
            <Link key={destaque.id} to={destaque.to} className={styles.card}>
              {/* Carta decorativa: inclinada, sangrando pela direita e por baixo */}
              <div className={styles.carta} aria-hidden="true">
                <div className={styles.face}>
                  <img
                    className={styles.imagem}
                    src={destaque.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>

              <div className={styles.conteudo}>
                <h3 className={styles.cardTitulo}>{destaque.titulo}</h3>
                <p className={styles.cardTexto}>{destaque.texto}</p>
                <span className={styles.explorar}>
                  Explorar
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}