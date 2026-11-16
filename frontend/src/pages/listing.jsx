import { Link, useParams } from "react-router-dom";
import { getListing } from "../api/listings";
import Aviso from "../components/Aviso/Aviso";
import DadosAnuncio from "../components/DadosAnuncio/DadosAnuncio";
import FormOferta from "../components/FormOferta/FormOferta";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";
import ModeracaoAnuncio from "../components/ModeracaoAnuncio/ModeracaoAnuncio";
import { useCarregar } from "../hooks/useCarregar";
import { useMe } from "../hooks/useMe";
import s from "../styles/paginas.module.css";

export default function ListingPage() {
  const { id } = useParams();
  const me = useMe();
  const { dados: anuncio, erro, carregando, recarregar } = useCarregar(() => getListing(id), id);

  if (carregando && !anuncio) return <div className={s.pagina}>Carregando...</div>;
  if (erro) {
    return (
      <div className={s.pagina}>
        <Aviso erro={erro} />
      </div>
    );
  }

  const souDono = me?.username === anuncio.owner.username;
  const souAdmin = me?.role === "ADMIN";
  const podeOfertar = me && !souDono && anuncio.status === "ACTIVE";

  return (
    <div className={s.pagina}>
      <div className={s.detalhe}>
        <ImagemCarta className={s.imagemCarta} src={anuncio.card.imageUrl} alt={anuncio.card.name} />
        <div>
          <DadosAnuncio anuncio={anuncio} />

          {souDono && (
            <p className={s.secao}>
              Este anúncio é seu.{" "}
              <Link className={s.link} to="/anuncios">
                Gerenciar em Meus anúncios
              </Link>
            </p>
          )}

          {!me && (
            <p className={s.secao}>
              <Link className={s.link} to="/login">
                Entre
              </Link>{" "}
              para fazer uma oferta.
            </p>
          )}

          {souAdmin && !souDono && <ModeracaoAnuncio anuncio={anuncio} onMudou={recarregar} />}
        </div>
      </div>

      {podeOfertar && <FormOferta anuncio={anuncio} />}
    </div>
  );
}
