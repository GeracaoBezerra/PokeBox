import { Link } from "react-router-dom";
import { addToWishlist } from "../../api/wishlist";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/paginas.module.css";
import Aviso from "../Aviso/Aviso";

export default function VoceEACarta({ card, user, onMudou }) {
  const wishlist = useAcao();

  async function adicionarWishlist() {
    const { ok } = await wishlist.executar(() => addToWishlist(card.id), "Carta adicionada à wishlist.");
    if (ok) onMudou();
  }

  return (
    <div className={`${s.secao} ${s.painel}`}>
      <h3>Você e esta carta</h3>
      <p>
        Você tem <strong>{user.inCollection}</strong> na coleção ·{" "}
        {user.inWishlist ? "está na sua wishlist" : "não está na sua wishlist"} ·{" "}
        {user.onTradeList ? "você tem anúncio ativo dela" : "sem anúncio ativo seu"}
      </p>
      <div className={s.acoes}>
        {!user.inWishlist && user.inCollection === 0 && (
          <button className={s.botaoSecundario} onClick={adicionarWishlist} disabled={wishlist.ocupado}>
            Adicionar à wishlist
          </button>
        )}
        <Link className={s.botaoSecundario} to="/colecao">
          Ver minha coleção
        </Link>
      </div>
      <Aviso erro={wishlist.erro} sucesso={wishlist.sucesso} />
    </div>
  );
}
