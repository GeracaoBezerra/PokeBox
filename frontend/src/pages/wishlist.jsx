import { Link } from "react-router-dom";
import { listWishlist, removeFromWishlist } from "../api/wishlist";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

export default function WishlistPage() {
  const { dados: itens, erro, carregando, recarregar } = useCarregar(listWishlist);
  const acao = useAcao();

  async function remover(item) {
    const { ok } = await acao.executar(() => removeFromWishlist(item.id), `${item.card.name} saiu da wishlist.`);
    if (ok) recarregar();
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Wishlist</h1>
      <p className={s.subtitulo}>
        Cartas que você procura. "Oportunidades" é quantos outros colecionadores têm a carta pública e disponível. Para
        adicionar, abra a carta no <Link className={s.link} to="/catalogo">catálogo</Link>.
      </p>

      <Aviso erro={erro || acao.erro} sucesso={acao.sucesso} />
      {carregando && !itens && <p className={s.suave}>Carregando...</p>}

      {itens && itens.length === 0 && <p className={s.suave}>Sua wishlist está vazia.</p>}

      {itens && itens.length > 0 && (
        <div className={s.grade}>
          {itens.map((item) => (
            <div key={item.id} className={s.cartaMini}>
              <Link to={`/cards/${item.cardId}`}>
                <ImagemCarta src={item.card.imageUrl} alt={item.card.name} />
              </Link>
              <strong>{item.card.name}</strong>
              <span className={s.suave}>
                {item.card.setName} · {item.card.number}
              </span>
              <span>
                {item.opportunities} {item.opportunities === 1 ? "oportunidade" : "oportunidades"}
              </span>
              <div className={s.acoes}>
                <Link className={s.link} to={`/marketplace?cardId=${item.cardId}`}>
                  Ver anúncios
                </Link>
                <button className={s.botaoPerigo} onClick={() => remover(item)} disabled={acao.ocupado}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
