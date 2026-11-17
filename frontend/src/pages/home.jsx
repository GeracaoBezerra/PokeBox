import BannerSwiper from "../components/BannerSwiper/BannerSwiper";
import CtaColecao from "../components/CtaColecao/CtaColecao";
import DestaquesHome from "../components/Destaqueshome/Destaqueshome";
import GridCartas from "../components/GridCartas/GridCartas";
import AnunciosRecentes from "../components/AnunciosRecentes/AnunciosRecentes";

function HomePage() {
  return (
    <>
      <BannerSwiper />
      <DestaquesHome/>
      <GridCartas/>
      <AnunciosRecentes/>
      <CtaColecao/>
    </>
  );
}

export default HomePage;
