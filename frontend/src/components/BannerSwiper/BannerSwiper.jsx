import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Link } from "react-router-dom";

import "swiper/css";
import "swiper/css/pagination";

import styles from "./BannerSwiper.module.css";

import colecionismoDesktop from "../../assets/banners/pokebox-colecionismo-desktop.jpg";
import colecionismoMobile from "../../assets/banners/pokebox-colecionismo-mobile.jpg";

import expansoesDesktop from "../../assets/banners/pokebox-expansoes-desktop.jpg";
import expansoesMobile from "../../assets/banners/pokebox-expansoes-mobile.jpg";

import batalhaDesktop from "../../assets/banners/pokebox-batalha-desktop.jpg";
import batalhaMobile from "../../assets/banners/pokebox-batalha-mobile.jpg";

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
      "Anuncie o que sobra na sua coleção e enconte quem tem o que você procura.",
    textoBotao: "Ver marketplace",
    link: "/cartas",
    imagemDesktop: batalhaDesktop,
    imagemMobile: batalhaMobile,
    alt: "Banner promocional de batalhas de Pokémon TCG",
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



export default function BannerSwiper() {
  return (
    <section className={styles.bannerSection} aria-label="Destaques da PokeBox">
      <Swiper
        className={styles.swiper}
        modules={[Autoplay, Navigation, Pagination]}
        slidesPerView={1}
        loop={true}
        navigation={false}
        pagination={{ clickable: true }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        speed={600}
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
                <h2 className={styles.bannerTitle}>{banner.titulo}</h2>

                <p className={styles.bannerDescription}>{banner.descricao}</p>

                <Link to={banner.link} className={styles.bannerButton}>
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
