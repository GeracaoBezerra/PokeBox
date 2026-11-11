import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicCollection } from "../api/collection";
import Aviso from "../components/Aviso/Aviso";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, formatarData, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

export default function PublicPerfilPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [busca, setBusca] = useState(username);
  const { dados, erro, carregando } = useCarregar(() => getPublicCollection(username), username);

  function buscar(evento) {
    evento.preventDefault();
    if (busca.trim()) navigate(`/u/${busca.trim().toLowerCase()}`);
  }

  return (
    <div className={s.pagina}>
      <form className={s.form} onSubmit={buscar}>
        <label className={s.campo}>
          Ver perfil de
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="username" />
        </label>
        <button className={s.botaoSecundario} type="submit">
          Abrir
        </button>
      </form>

      <Aviso erro={erro} />
      {carregando && !dados && <p className={s.suave}>Carregando...</p>}

      {dados && (
        <div className={s.secao}>
          <h1 className={s.titulo}>{dados.user.name}</h1>
          <p className={s.subtitulo}>
            @{dados.user.username} · no PokeBox desde {formatarData(dados.user.createdAt)} ·{" "}
            <Link className={s.link} to={`/marketplace?username=${dados.user.username}`}>
              anúncios
            </Link>
          </p>

          {dados.items.length === 0 ? (
            <p className={s.suave}>Nenhuma carta pública.</p>
          ) : (
            <div className={s.grade}>
              {dados.items.map((item) => (
                <Link key={item.id} to={`/cards/${item.card.id}`} className={s.cartaMini}>
                  <ImagemCarta src={item.card.imageUrl} alt={item.card.name} />
                  <strong>{item.card.name}</strong>
                  <span className={s.suave}>
                    {variante(item)} · {CONDICOES[item.condition]}
                  </span>
                  <span>Quantidade: {item.quantity}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
