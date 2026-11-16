import { Link, useParams, useSearchParams } from "react-router-dom";
import { getCard } from "../api/cards";
import { useSession } from "../auth/useSession";
import AnunciosDaCarta from "../components/AnunciosDaCarta/AnunciosDaCarta";
import Aviso from "../components/Aviso/Aviso";
import DadosCarta from "../components/DadosCarta/DadosCarta";
import FormColecao from "../components/FormColecao/FormColecao";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";
import VoceEACarta from "../components/VoceEACarta/VoceEACarta";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";

export default function CardPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const lang = params.get("lang") ?? "en";
  const session = useSession();
  const { dados, erro, carregando, recarregar } = useCarregar(() => getCard(id, lang), `${id}|${lang}|${!!session}`);

  if (carregando && !dados) return <div className={s.pagina}>Carregando...</div>;
  if (erro) {
    return (
      <div className={s.pagina}>
        <Aviso erro={erro} onTentarDeNovo={recarregar} />
      </div>
    );
  }

  const { card, user, listings } = dados;

  return (
    <div className={s.pagina}>
      <div className={s.detalhe}>
        <div>
          <ImagemCarta className={s.imagemCarta} src={card.image?.large} alt={card.name} />
        </div>

        <div>
          <DadosCarta card={card} />

          {user ? (
            <>
              <VoceEACarta card={card} user={user} onMudou={recarregar} />
              <div className={s.secao}>
                <FormColecao card={card} onAdicionado={recarregar} />
              </div>
            </>
          ) : (
            <p className={s.secao}>
              <Link className={s.link} to="/login">
                Entre
              </Link>{" "}
              para adicionar à coleção ou à wishlist.
            </p>
          )}
        </div>
      </div>

      <AnunciosDaCarta listings={listings} />
    </div>
  );
}
