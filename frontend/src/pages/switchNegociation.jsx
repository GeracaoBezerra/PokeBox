import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoTroca from "../components/CartaoTroca/CartaoTroca";
import { idDaAba } from "../components/Abas/idDaAba";
import Paginacao from "../components/Paginacao/Paginacao";
import { Link } from "react-router-dom";
import { useCarregar } from "../hooks/useCarregar";
import { useFiltrosNegociacao } from "../hooks/useFiltrosNegociacao";
import s from "../styles/paginas.module.css";
import { STATUS_TROCA } from "../utils/rotulos";

const VAZIO = {
  recebidas: {
    texto: "Nenhuma troca recebida. Elas aparecem quando alguém cria a troca a partir de uma oferta que você aceitou.",
    para: "/propostas",
    link: "Ver propostas",
  },
  enviadas: {
    texto: "Você ainda não criou trocas. Crie a partir de uma oferta aceita.",
    para: "/propostas?aba=enviadas",
    link: "Ver propostas enviadas",
  },
};

const PAINEL = "painel-trocas";

export default function SwitchNegociationPage() {
  const { aba, side, status, page, atualizar } = useFiltrosNegociacao(STATUS_TROCA);
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => listMyTrades({ side, status, page }),
    JSON.stringify({ side, status, page })
  );

  const lista = carregando ? [] : dados?.items ?? [];
  const vazia = !carregando && dados && lista.length === 0;

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Trocas">
        Recebidas: trocas nos seus anúncios (você conclui ou recusa). Enviadas: trocas que você criou a partir de uma
        oferta aceita (você pode cancelar). Enquanto a troca está em andamento, as cartas ficam reservadas.
      </CabecalhoPagina>

      <AbasNegociacao
        rotulo="Trocas"
        idPainel={PAINEL}
        aba={aba}
        onAba={(valor) => atualizar({ aba: valor })}
        status={status}
        onStatus={(valor) => atualizar({ status: valor })}
        rotulosStatus={STATUS_TROCA}
      />

      <div role="tabpanel" id={PAINEL} aria-labelledby={idDaAba(PAINEL, aba)}>
        <Aviso erro={erro} onTentarDeNovo={recarregar} />
        {carregando && <CarregandoCartas formato="negociacoes" total={4} />}
        {vazia && page > 1 && <p className={s.suave}>Nenhuma troca nesta página.</p>}
        {vazia && page === 1 && status && (
          <div className={s.acoes}>
            <p className={s.suave}>Nada com este status.</p>
            <button type="button" className={s.botaoSecundario} onClick={() => atualizar({ status: "" })}>
              Ver todos os status
            </button>
          </div>
        )}
        {vazia && page === 1 && !status && (
          <div className={s.acoes}>
            <p className={s.suave}>{VAZIO[aba].texto}</p>
            <Link className={s.link} to={VAZIO[aba].para}>
              {VAZIO[aba].link}
            </Link>
          </div>
        )}

        <div className={s.gradeNegociacoes}>
          {lista.map((troca) => (
            <CartaoTroca key={troca.id} troca={troca} souDonoDoAnuncio={aba === "recebidas"} onMudou={recarregar} />
          ))}
        </div>

        {dados && !carregando && (lista.length > 0 || page > 1) && (
          <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={(nova) => atualizar({ page: nova }, false)} />
        )}
      </div>
    </div>
  );
}
