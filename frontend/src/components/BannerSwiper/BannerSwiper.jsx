import { useSyncExternalStore } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Link } from "react-router-dom";

import "swiper/css";
import "swiper/css/pagination";

import styles from "./BannerSwiper.module.css";

import colecionismoDesktop from "../../assets/banners/pokebox-colecionismo-desktop.webp";
import colecionismoMobile from "../../assets/banners/pokebox-colecionismo-mobile.webp";

import expansoesDesktop from "../../assets/banners/pokebox-expansoes-desktop.webp";
import expansoesMobile from "../../assets/banners/pokebox-expansoes-mobile.webp";

import batalhaDesktop from "../../assets/banners/pokebox-batalha-desktop.webp";
import batalhaMobile from "../../assets/banners/pokebox-batalha-mobile.webp";

const mediaQuery = "(prefers-reduced-motion: reduce)";

const banners = [
  {
    id: 1,
    titulo: "Encontre sua próxima raridade",
    descricao: "Expanda sua coleção com cartas incríveis de Pokémon TCG.",
    textoBotao: "Explorar coleção",
    link: "/colecao",
    imagemDesktop: colecionismoDesktop,
    imagemMobile: colecionismoMobile,
    alt: "Banner promocional de cartas raras de Pokémon TCG",
  },
  {
    id: 2,
    titulo: "Troque suas cartas repetidas.",
    descricao:
      "Anuncie o que sobra na sua coleção e encontre quem tem o que você procura.",
    textoBotao: "Ver marketplace",
    link: "/cartas",
    imagemDesktop: batalhaDesktop,
    imagemMobile: batalhaMobile,
    alt: "Banner promocional de troca de cartas repetidas",
  },
  {
    id: 3,
    titulo: "Novas expansões, novas possibilidades",
    descricao: "Descubra cartas e novidades para sua coleção.",
    textoBotao: "Ver expansões",
    link: "/expansoes",
    imagemDesktop: expansoesDesktop,
    imagemMobile: expansoesMobile,
    alt: "Banner promocional de novas expansões de Pokémon TCG",
  },
];

function subscribe(callback) {
  const query = window.matchMedia(mediaQuery);

  query.addEventListener("change", callback);

  return () => {
    query.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  return window.matchMedia(mediaQuery).matches;
}

function getServerSnapshot() {
  return false;
}

export default function BannerSwiper() {
  const reduzirMovimento = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <section
      className={styles.bannerSection}
      aria-label="Destaques da PokeBox"
    >
      <Swiper
        className={styles.swiper}
        modules={[Autoplay, Navigation, Pagination]}
        slidesPerView={1}
        loop={true}
        navigation={false}
        pagination={{ clickable: true }}
        autoplay={
          reduzirMovimento
            ? false
            : {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
        }
        speed={reduzirMovimento ? 0 : 600}
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <article className={styles.banner}>
              <picture className={styles.bannerPicture}>
                <source
                  media="(max-width: 768px)"
                  srcSet={banner.imagemMobile}
                />

                <img
                  className={styles.bannerImage}
                  src={banner.imagemDesktop}
                  alt={banner.alt}
                  fetchPriority={banner.id === 1 ? "high" : "auto"}
                  loading={banner.id === 1 ? "eager" : "lazy"}
                />
              </picture>

              <div className={styles.bannerContent}>
                <h2 className={styles.bannerTitle}>
                  {banner.titulo}
                </h2>

                <p className={styles.bannerDescription}>
                  {banner.descricao}
                </p>

                <Link
                  to={banner.link}
                  className={styles.bannerButton}
                >
                  {banner.textoBotao}
                </Link>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
