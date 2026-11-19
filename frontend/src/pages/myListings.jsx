import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { Link } from "react-router-dom";
import { listMyListings } from "../api/listings";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import TabelaMeusAnuncios from "../components/TabelaMeusAnuncios/TabelaMeusAnuncios";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";

export default function MyListingsPage() {
  const { dados: anuncios, erro, carregando, recarregar } = useCarregar(listMyListings);

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Meus anúncios">
        Pausar tira do marketplace sem mexer nas ofertas. Fechar é definitivo e cancela as ofertas abertas e as aceitas
        que ainda não viraram troca. Diminuir a quantidade cancela as aceitas que pedem mais do que o novo valor. Para
        anunciar, use a <Link className={s.link} to="/colecao">coleção</Link>.
      </CabecalhoPagina>

      <Aviso erro={erro} onTentarDeNovo={recarregar} />
      {carregando && <CarregandoCartas formato="tabela" total={6} />}
      {!carregando && anuncios && anuncios.length === 0 && <p className={s.suave}>Você ainda não anunciou nada.</p>}
      {!carregando && anuncios && anuncios.length > 0 && <TabelaMeusAnuncios anuncios={anuncios} onMudou={recarregar} />}
    </div>
  );
}
