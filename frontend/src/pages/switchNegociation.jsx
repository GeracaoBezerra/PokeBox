import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { useState } from "react";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoTroca from "../components/CartaoTroca/CartaoTroca";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { STATUS_TROCA } from "../utils/rotulos";

export default function SwitchNegociationPage() {
  const [aba, setAba] = useState("received");
  const [status, setStatus] = useState("");
  const { dados, erro, carregando, recarregar } = useCarregar(() => listMyTrades(status), status);

  const lista = carregando ? [] : dados?.[aba] ?? [];

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Trocas">
        Recebidas: trocas nos seus anúncios (você conclui ou recusa). Enviadas: trocas que você criou a partir de uma
        oferta aceita (você pode cancelar). Enquanto a troca está em andamento, as cartas ficam reservadas.
      </CabecalhoPagina>

      <AbasNegociacao
        aba={aba}
        onAba={setAba}
        dados={dados}
        status={status}
        onStatus={setStatus}
        rotulosStatus={STATUS_TROCA}
      />

      <Aviso erro={erro} />
      {carregando && <CarregandoCartas formato="negociacoes" total={4} />}
      {!carregando && dados && lista.length === 0 && <p className={s.suave}>Nenhuma troca aqui.</p>}

      <div className={s.gradeNegociacoes}>
        {lista.map((troca) => (
          <CartaoTroca key={troca.id} troca={troca} souDonoDoAnuncio={aba === "received"} onMudou={recarregar} />
        ))}
      </div>
    </div>
  );
}
