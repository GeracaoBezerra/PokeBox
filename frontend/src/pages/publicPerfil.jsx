import { Link, useParams, useSearchParams } from "react-router-dom";
import { SearchX, UserX } from "lucide-react";
import { getPublicCollection } from "../api/collection";
import { listListings } from "../api/listings";
import Aviso from "../components/Aviso/Aviso";
import BarraBusca from "../components/BarraBusca/BarraBusca";
import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import CartaMini from "../components/CartaMini/CartaMini";
import Paginacao from "../components/Paginacao/Paginacao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import v from "../styles/vitrine.module.css";
import { anuncioPorItem, filtrosDoPerfil, textoAnunciosAtivos } from "../utils/perfilPublico";
import { CONDICOES, TIPOS, formatarData, variante } from "../utils/rotulos";

const POR_PAGINA = 24;

export default function PublicPerfilPage() {
  const { username } = useParams();
  const [params, setParams] = useSearchParams();
  const { q, type, page, buscaCurta, qApi } = filtrosDoPerfil(params);
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => getPublicCollection(username, { q: qApi, type, page, limit: POR_PAGINA }),
    JSON.stringify({ username, q: qApi, type, page })
  );
  const listaAnuncios = useCarregar(() => listListings({ username, limit: 100 }), username);
  const anuncios = listaAnuncios.dados?.items ?? [];
  const porItem = anuncioPorItem(anuncios);
  const textoAnuncios = textoAnunciosAtivos(anuncios.length, listaAnuncios.dados?.pagination?.hasNextPage);
  const temFiltro = Boolean(q || type);
  const naoEncontrado = erro && (erro.status === 404 || erro.status === 400);

  function atualizar(mudancas, reiniciarPagina = true) {
    const novos = new URLSearchParams(params);
    for (const [campo, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(campo, String(valor));
      else novos.delete(campo);
    }
    if (reiniciarPagina) novos.delete("page");
    setParams(novos);
  }

  if (naoEncontrado) {
    return (
      <div className={s.pagina}>
        <div className={v.vazio}>
          <UserX size={32} aria-hidden="true" />
          <h1>Colecionador não encontrado</h1>
          <p>Confira o nome de usuário ou procure cartas no marketplace.</p>
          <Link className={v.botao} to="/marketplace">
            Ir para o marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <Aviso erro={erro} onTentarDeNovo={recarregar} />

      {dados?.user?.username === username && (
        <header>
          <h1 className={s.titulo}>{dados.user.name}</h1>
          <p className={s.subtitulo}>
            @{dados.user.username} · no PokeBox desde {formatarData(dados.user.createdAt)}
            {textoAnuncios && (
              <>
                {" · "}
                <Link className={s.link} to={`/marketplace?username=${dados.user.username}`}>
                  {textoAnuncios}
                </Link>
              </>
            )}
          </p>
        </header>
      )}

      {!erro && (
        <div className={v.barra}>
          <BarraBusca
            rotulo="Buscar na coleção"
            placeholder="Nome da carta ou do set…"
            valor={q}
            onBuscar={(texto) => atualizar({ q: texto })}
          />
          <label className={v.campo}>
            Tipo
            <select value={type} onChange={(e) => atualizar({ type: e.target.value })}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPOS).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {buscaCurta && <p className={v.dica}>Digite pelo menos 2 letras ou números para buscar pelo nome.</p>}

      {carregando && <CarregandoCartas />}

      {!carregando && dados && (
        <section className={s.secao} aria-label="Coleção pública">
          {dados.items.length === 0 ? (
            temFiltro ? (
              <div className={v.vazio}>
                <SearchX size={32} aria-hidden="true" />
                <h2>Nenhuma carta com esses filtros</h2>
                <button type="button" className={v.botao} onClick={() => atualizar({ q: "", type: "" })}>
                  Limpar filtros
                </button>
              </div>
            ) : (
              <p className={s.suave}>Nenhuma carta pública.</p>
            )
          ) : (
            <div className={s.grade}>
              {dados.items.map((item) => {
                const anuncio = porItem.get(item.id);
                return (
                  <CartaMini key={item.id} to={`/cards/${item.card.id}`} carta={item.card}>
                    <span className={s.suave}>
                      {variante(item)} · {CONDICOES[item.condition]}
                    </span>
                    <span>Quantidade: {item.quantity}</span>
                    {anuncio && (
                      <Link className={s.seloTroca} to={`/marketplace/${anuncio.id}`}>
                        Para troca
                      </Link>
                    )}
                  </CartaMini>
                );
              })}
            </div>
          )}
          {(dados.items.length > 0 || page > 1) && (
            <Paginacao
              pagina={page}
              temProxima={dados.pagination?.hasNextPage}
              onIrPara={(novaPagina) => atualizar({ page: novaPagina }, false)}
            />
          )}
        </section>
      )}
    </div>
  );
}
