import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicCollection } from "../api/collection";
import Aviso from "../components/Aviso/Aviso";
import BuscaPerfil from "../components/BuscaPerfil/BuscaPerfil";
import CartaMini from "../components/CartaMini/CartaMini";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, formatarData, variante } from "../utils/rotulos";

export default function PublicPerfilPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { dados, erro, carregando } = useCarregar(() => getPublicCollection(username), username);

  return (
    <div className={s.pagina}>
      <BuscaPerfil username={username} onBuscar={(busca) => navigate(`/u/${busca}`)} />

      <Aviso erro={erro} />
      {carregando && <CarregandoCartas />}

      {!carregando && dados && (
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
                <CartaMini key={item.id} to={`/cards/${item.card.id}`} carta={item.card}>
                  <span className={s.suave}>
                    {variante(item)} · {CONDICOES[item.condition]}
                  </span>
                  <span>Quantidade: {item.quantity}</span>
                </CartaMini>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
