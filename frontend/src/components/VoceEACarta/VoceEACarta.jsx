import { Link } from "react-router-dom";
import { useState } from "react";
import { Heart, HeartCrack, Layers, Check, Megaphone } from "lucide-react";
import { addToWishlist, listWishlist, removeFromWishlist } from "../../api/wishlist";
import { useSession } from "../../auth/useSession";
import { useAcao } from "../../hooks/useAcao";
import s from "../../styles/detalheCarta.module.css";
import Aviso from "../Aviso/Aviso";
import AnunciarCarta from "../AnunciarCarta/AnunciarCarta";
import Modal from "../Modal/Modal";

export default function VoceEACarta({ card, lang, user, listings = [], onMudou, atualizando = false }) {
  const session = useSession();
  const [modalAberto, setModalAberto] = useState(false);
  const wishlist = useAcao();
  const ocupado = wishlist.ocupado || atualizando;
  const IconeWishlist = user.inWishlist ? HeartCrack : Heart;
  const meuAnuncio = listings.find(
    (anuncio) => anuncio.owner?.username === session?.user?.username
  );
  const destino = meuAnuncio
    ? `/marketplace/${encodeURIComponent(meuAnuncio.id)}`
    : "/anuncios";

  function anuncioCriado() {
    setModalAberto(false);
    onMudou();
  }

  async function alternarWishlist() {
    if (ocupado) return;
    const { ok } = await wishlist.executar(async () => {
      if (!user.inWishlist) return addToWishlist(card.id, lang);
      // A exclusão exige o id do item da wishlist, não o id da carta.
      const itens = await listWishlist();
      const item = itens.find((item) => item.cardId === card.id);
      if (item) await removeFromWishlist(item.id);
    }, user.inWishlist ? "Carta removida da wishlist." : "Carta adicionada à wishlist.", { tipo: user.inWishlist ? "info" : "sucesso" });
    if (ok) onMudou();
  }
  return (
    <section className={s.suaCarta} aria-label="Esta carta na sua coleção">
      <div className={s.situacao}>
        <Layers size={20} aria-hidden="true" />
        <div><h2>Sua coleção</h2><p>{user.inCollection > 0 ? `${user.inCollection} ${user.inCollection === 1 ? "cópia na sua coleção" : "cópias na sua coleção"}` : "Você ainda não tem esta carta"}</p></div>
        {user.inCollection > 0 && <Check size={20} aria-label="Na coleção" />}
      </div>
      {user.onTradeList && <p className={s.suave}>Você tem um anúncio ativo desta carta.</p>}
      <div className={s.acoes}>
        {user.inCollection > 0 && !user.onTradeList && (
          <button type="button" className={s.botaoSecundario} onClick={() => setModalAberto(true)}>
            <Megaphone size={16} aria-hidden="true" /> Anunciar esta carta
          </button>
        )}
        {user.onTradeList && (
          <Link className={s.link} to={destino}>Ver meu anúncio</Link>
        )}
        {(user.inWishlist || user.inCollection === 0) && (
          <button
            className={`${s.botaoSecundario} ${s.botaoWishlist}`}
            onClick={alternarWishlist}
            disabled={ocupado}
            aria-busy={ocupado}
            aria-pressed={user.inWishlist}
            aria-label={user.inWishlist ? "Remover da wishlist" : "Adicionar à wishlist"}
          >
            <IconeWishlist size={16} aria-hidden="true" />
            <span className={s.rotulosWishlist} aria-hidden="true">
              <span data-visivel={!ocupado && !user.inWishlist}>Quero esta carta</span>
              <span data-visivel={!ocupado && user.inWishlist}>Na wishlist · remover</span>
              <span data-visivel={ocupado}>Atualizando…</span>
            </span>
          </button>
        )}
        <Link className={s.link} to="/procuro">Ver wishlist</Link>
        <Link className={s.link} to="/colecao">Ver minha coleção</Link>
      </div>
      <div className={s.feedbackWishlist} data-visivel={Boolean(wishlist.erro)}>
        <div><Aviso erro={wishlist.erro} /></div>
      </div>
      <Modal aberto={modalAberto} titulo="Anunciar esta carta" onFechar={() => setModalAberto(false)}>
        <AnunciarCarta card={card} onCriado={anuncioCriado} />
      </Modal>
    </section>
  );
}
