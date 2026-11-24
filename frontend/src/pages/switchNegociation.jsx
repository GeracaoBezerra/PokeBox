import { Inbox, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Atualizando from "../components/Atualizando/Atualizando";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoTroca from "../components/CartaoTroca/CartaoTroca";
import { idDaAba } from "../components/Abas/idDaAba";
import Paginacao from "../components/Paginacao/Paginacao";
import { useCarregar } from "../hooks/useCarregar";
import { useFiltrosNegociacao } from "../hooks/useFiltrosNegociacao";
import s from "../styles/negociacoes.module.css";
import { STATUS_TROCA } from "../utils/rotulos";

const PAINEL = "painel-trocas";
const VAZIO = {
  recebidas: {
    titulo: "Nenhuma troca recebida",
    texto: "Elas aparecem quando você aceita uma oferta num anúncio seu.",
    para: "/propostas",
    link: "Ver propostas",
    Icone: Inbox,
  },
  enviadas: {
    titulo: "Nenhuma troca enviada",
    texto: "Elas aparecem quando o dono aceita uma oferta sua.",
    para: "/propostas?aba=enviadas",
    link: "Ver propostas enviadas",
    Icone: Send,
  },
};

function SemTrocas({ aba, status, page, limpar }) {
  const { titulo, texto, para, link, Icone } = VAZIO[aba];
  if (page > 1) return <div className={s.vazio}><h2>Nenhuma troca nesta página</h2></div>;

  return (
    <div className={s.vazio}>
      <Icone size={24} aria-hidden="true" />
      <h2>{status ? "Nenhuma troca com este status" : titulo}</h2>
      {status ? <button className={s.atalho} type="button" onClick={limpar}>Ver todos os status</button> : (
        <>
          <p>{texto}</p>
          <Link className={s.atalho} to={para}>{link}</Link>
        </>
      )}
    </div>
  );
}

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

      <div className={s.filtros}>
        <AbasNegociacao
          rotulo="Trocas"
          idPainel={PAINEL}
          aba={aba}
          onAba={(valor) => atualizar({ aba: valor })}
          status={status}
          onStatus={(valor) => atualizar({ status: valor })}
          rotulosStatus={STATUS_TROCA}
        />
      </div>

      <div role="tabpanel" id={PAINEL} aria-labelledby={idDaAba(PAINEL, aba)}>
        {primeiraCarga && (
          <div className={s.carregando} role="status" aria-label="Carregando trocas">
            <div aria-hidden="true"><span /><span /></div>
            <div aria-hidden="true"><span /><span /></div>
          </div>
        )}

        <Atualizando atualizando={carregando && !primeiraCarga}>
          {lista.length > 0 && (
            <ul className={s.lista} role="list" aria-label="Lista de trocas">
              {lista.map((troca) => (
                <li key={troca.id}>
                  <CartaoTroca troca={troca} souDonoDoAnuncio={aba === "recebidas"} onMudou={recarregar} />
                </li>
              ))}
            </ul>
          )}
          {vazia && !erro && <SemTrocas aba={aba} status={status} page={page} limpar={() => atualizar({ status: "" })} />}

          {daAba && !primeiraCarga && (lista.length > 0 || page > 1) && (
            <Paginacao pagina={page} temProxima={daAba.pagination?.hasNextPage} onIrPara={(nova) => atualizar({ page: nova }, false)} />
          )}
        </Atualizando>

        <div className={s.fimLista}>
          <Aviso erro={erro} />
          {erro && <button type="button" className={s.atalho} onClick={recarregar}>Tentar de novo</button>}
        </div>
      </div>
    </div>
  );
}
