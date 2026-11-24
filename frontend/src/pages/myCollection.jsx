import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { Link } from "react-router-dom";
import { listCollection } from "../api/collection";
import { useSession } from "../auth/useSession";
import Atualizando from "../components/Atualizando/Atualizando";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import TabelaColecao from "../components/TabelaColecao/TabelaColecao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";

export default function MyCollectionPage() {
  const session = useSession();
  const { dados: itens, erro, carregando, primeiraCarga, recarregar } = useCarregar(listCollection);

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

      <Aviso erro={erro} onTentarDeNovo={recarregar} />
      {primeiraCarga && <CarregandoCartas formato="tabela" total={6} />}
      {!primeiraCarga && itens && itens.length === 0 && <p className={s.suave}>Sua coleção está vazia.</p>}
      {!primeiraCarga && itens && itens.length > 0 && (
        <Atualizando atualizando={carregando}>
          <TabelaColecao itens={itens} onMudou={recarregar} />
        </Atualizando>
      )}
    </div>
  );
}
