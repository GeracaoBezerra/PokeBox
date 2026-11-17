import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { useSearchParams } from "react-router-dom";
import { listListings } from "../api/listings";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaMini from "../components/CartaMini/CartaMini";
import FiltrosMarketplace from "../components/FiltrosMarketplace/FiltrosMarketplace";
import Paginacao from "../components/Paginacao/Paginacao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, variante } from "../utils/rotulos";

function semVazios(filtros) {
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
}

export default function MarketplacePage() {
  const [params, setParams] = useSearchParams();
  const cardId = params.get("cardId") ?? "";
  const username = params.get("username") ?? "";
  const page = Number(params.get("page") ?? 1);

  const { dados, erro, carregando } = useCarregar(
    () => listListings({ cardId, username, page, limit: 24 }),
    `${cardId}|${username}|${page}`
  );

  function filtrar(filtros) {
    setParams(semVazios(filtros));
  }

  function irPara(novaPagina) {
    setParams(semVazios({ page: String(novaPagina), cardId, username }));
  }

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Marketplace">Anúncios de troca ativos, mais novos primeiro.</CabecalhoPagina>

      <FiltrosMarketplace cardId={cardId} username={username} onFiltrar={filtrar} />

      <Aviso erro={erro} />
      {carregando && <CarregandoCartas total={24} />}

      {!carregando && dados && (
        <div className={s.secao}>
          {dados.items.length === 0 ? (
            <p className={s.suave}>Nenhum anúncio encontrado.</p>
          ) : (
            <div className={s.grade}>
              {dados.items.map((anuncio) => (
                <CartaMini
                  key={anuncio.id}
                  to={`/marketplace/${anuncio.id}`}
                  carta={anuncio.card}
                >
                  <span className={s.suave}>
                    {variante(anuncio.item)} · {CONDICOES[anuncio.item.condition]}
                  </span>
                  <span>
                    {anuncio.quantity} disponível · @{anuncio.owner.username}
                  </span>
                </CartaMini>
              ))}
            </div>
          )}
          <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={irPara} />
        </div>
      )}
    </div>
  );
}
