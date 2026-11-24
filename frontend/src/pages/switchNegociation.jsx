import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Atualizando from "../components/Atualizando/Atualizando";
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
    texto: "Nenhuma troca recebida. Elas aparecem quando você aceita uma oferta num anúncio seu.",
    para: "/propostas",
    link: "Ver propostas",
  },
  enviadas: {
    texto: "Nenhuma troca enviada. Elas aparecem quando o dono aceita uma oferta sua.",
    para: "/propostas?aba=enviadas",
    link: "Ver propostas enviadas",
  },
};

const PAINEL = "painel-trocas";

export default function SwitchNegociationPage() {
  const { aba, side, status, page, atualizar } = useFiltrosNegociacao(STATUS_TROCA);
  const { dados, erro, carregando, recarregar } = useCarregar(
    async () => ({ ...(await listMyTrades({ side, status, page })), side }),
    JSON.stringify({ side, status, page })
  );

  const daAba = dados?.side === side ? dados : null;
  const primeiraCarga = carregando && !daAba;
  const lista = primeiraCarga ? [] : daAba?.items ?? [];
  const vazia = !carregando && daAba && lista.length === 0;

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Trocas">
        Recebidas: trocas nos seus anúncios (você pode recusar). Enviadas: trocas das suas ofertas aceitas (você pode
        cancelar). As cartas ficam reservadas até os dois confirmarem o recebimento; aí elas mudam de dono.
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
        {primeiraCarga && <CarregandoCartas formato="negociacoes" total={4} />}
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

        <Atualizando atualizando={carregando && !primeiraCarga}>
          <div className={s.gradeNegociacoes}>
            {lista.map((troca) => (
              <CartaoTroca key={troca.id} troca={troca} souDonoDoAnuncio={aba === "recebidas"} onMudou={recarregar} />
            ))}
          </div>

          {daAba && !primeiraCarga && (lista.length > 0 || page > 1) && (
            <Paginacao pagina={page} temProxima={daAba.pagination?.hasNextPage} onIrPara={(nova) => atualizar({ page: nova }, false)} />
          )}
        </Atualizando>
      </div>
    </div>
  );
}
