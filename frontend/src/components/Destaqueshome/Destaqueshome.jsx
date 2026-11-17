import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import styles from "./Destaqueshome.module.css";

// Imagens da TCGdex (Base Set). Troque por arquivos locais em
// assets/cards/ importando como no BannerSwiper:
// import mewtwo from "../../assets/cards/mewtwo.webp";
const destaques = [
  {
    id: 1,
    titulo: "Novas adições",
    texto: "As últimas cartas anunciadas para troca.",
    to: "/marketplace",
    src: "https://assets.tcgdex.net/en/base/base1/10/high.webp",
  },
  {
    id: 3,
    titulo: "Mais desejadas",
    texto: "Cartas que aparecem em mais wishlists.",
    to: "#mais-desejadas",
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
          {destaques.map((destaque) => {
            const Componente = destaque.to.startsWith("#") ? "a" : Link;
            const destino = destaque.to.startsWith("#") ? { href: destaque.to } : { to: destaque.to };
            return (
            <Componente key={destaque.id} {...destino} className={styles.card}>
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
            </Componente>
            );
          })}
        </div>
      </div>
    </section>
  );
}
