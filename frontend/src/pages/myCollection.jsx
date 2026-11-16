import { Link } from "react-router-dom";
import { listCollection } from "../api/collection";
import { useSession } from "../auth/useSession";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import TabelaColecao from "../components/TabelaColecao/TabelaColecao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";

export default function MyCollectionPage() {
  const session = useSession();
  const { dados: itens, erro, carregando, recarregar } = useCarregar(listCollection);

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Minha coleção">
        Disponível = quantidade − reservada (reservada é o que está numa troca em andamento). Para adicionar cartas, use o{" "}
        <Link className={s.link} to="/catalogo">
          catálogo
        </Link>
        . Seu perfil público:{" "}
        <Link className={s.link} to={`/u/${session?.user?.username}`}>
          /u/{session?.user?.username}
        </Link>
      </CabecalhoPagina>

      <Aviso erro={erro} />
      {carregando && !itens && <p className={s.suave}>Carregando...</p>}
      {itens && itens.length === 0 && <p className={s.suave}>Sua coleção está vazia.</p>}
      {itens && itens.length > 0 && <TabelaColecao itens={itens} onMudou={recarregar} />}
    </div>
  );
}
