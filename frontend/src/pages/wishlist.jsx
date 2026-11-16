import { Link } from "react-router-dom";
import { listWishlist, removeFromWishlist } from "../api/wishlist";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import ItemWishlist from "../components/ItemWishlist/ItemWishlist";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";

export default function WishlistPage() {
  const { dados: itens, erro, carregando, recarregar } = useCarregar(listWishlist);
  const acao = useAcao();

  async function remover(item) {
    const { ok } = await acao.executar(() => removeFromWishlist(item.id), `${item.card.name} saiu da wishlist.`);
    if (ok) recarregar();
  }

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Wishlist">
        Cartas que você procura. "Oportunidades" é quantos outros colecionadores têm a carta pública e disponível. Para
        adicionar, abra a carta no <Link className={s.link} to="/catalogo">catálogo</Link>.
      </CabecalhoPagina>

      <Aviso erro={erro || acao.erro} sucesso={acao.sucesso} />
      {carregando && !itens && <p className={s.suave}>Carregando...</p>}
      {itens && itens.length === 0 && <p className={s.suave}>Sua wishlist está vazia.</p>}

      {itens && itens.length > 0 && (
        <div className={s.grade}>
          {itens.map((item) => (
            <ItemWishlist key={item.id} item={item} ocupado={acao.ocupado} onRemover={remover} />
          ))}
        </div>
      )}
    </div>
  );
}
