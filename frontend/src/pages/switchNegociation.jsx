import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoTroca from "../components/CartaoTroca/CartaoTroca";
import Paginacao from "../components/Paginacao/Paginacao";
import { useCarregar } from "../hooks/useCarregar";
import { useFiltrosNegociacao } from "../hooks/useFiltrosNegociacao";
import s from "../styles/paginas.module.css";
import { STATUS_TROCA } from "../utils/rotulos";

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
        aba={aba}
        onAba={(valor) => atualizar({ aba: valor })}
        status={status}
        onStatus={(valor) => atualizar({ status: valor })}
        rotulosStatus={STATUS_TROCA}
      />

      <Aviso erro={erro} onTentarDeNovo={recarregar} />
      {carregando && <CarregandoCartas formato="negociacoes" total={4} />}
      {vazia && <p className={s.suave}>{page > 1 ? "Nenhuma troca nesta página." : "Nenhuma troca aqui."}</p>}

      <div className={s.gradeNegociacoes}>
        {lista.map((troca) => (
          <CartaoTroca key={troca.id} troca={troca} souDonoDoAnuncio={aba === "recebidas"} onMudou={recarregar} />
        ))}
      </div>

      {dados && !carregando && (lista.length > 0 || page > 1) && (
        <Paginacao pagina={page} temProxima={dados.pagination?.hasNextPage} onIrPara={(nova) => atualizar({ page: nova }, false)} />
      )}
    </div>
  );
}
