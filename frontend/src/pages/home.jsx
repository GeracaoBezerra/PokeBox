import BannerSwiper from "../components/BannerSwiper/BannerSwiper";
import CtaColecao from "../components/CtaColecao/CtaColecao";
import DestaquesHome from "../components/Destaqueshome/Destaqueshome";
import GridCartas from "../components/GridCartas/GridCartas";

function HomePage() {
  return (
    <>
      <BannerSwiper />
      <DestaquesHome/>
      <GridCartas/>
      <CtaColecao/>
    </>
  );
}

export default HomePage;
