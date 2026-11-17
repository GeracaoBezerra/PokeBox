import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { useState } from "react";
import { listMyOffers } from "../api/offers";
import { listMyTrades } from "../api/trades";
import AbasNegociacao from "../components/AbasNegociacao/AbasNegociacao";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CartaoOferta from "../components/CartaoOferta/CartaoOferta";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { STATUS_NEGOCIACAO } from "../utils/rotulos";

async function carregarPropostas(status) {
  const [ofertas, trocas] = await Promise.all([listMyOffers(status), listMyTrades()]);
  const ofertasComTroca = new Set([...trocas.sent, ...trocas.received].map((troca) => troca.offerId));
  return { ...ofertas, ofertasComTroca };
}

export default function MyOffersPage() {
  const [aba, setAba] = useState("received");
  const [status, setStatus] = useState("");
  const { dados, erro, carregando, recarregar } = useCarregar(() => carregarPropostas(status), status);

  const lista = carregando ? [] : dados?.[aba] ?? [];

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Propostas">
        Ofertas que você recebeu nos seus anúncios e que você fez nos anúncios dos outros. Depois que o dono aceita, quem
        ofertou cria a troca.
      </CabecalhoPagina>

      <AbasNegociacao
        aba={aba}
        onAba={setAba}
        dados={dados}
        status={status}
        onStatus={setStatus}
        rotulosStatus={STATUS_NEGOCIACAO}
      />

      <Aviso erro={erro} />
      {carregando && <CarregandoCartas formato="negociacoes" total={4} />}
      {!carregando && dados && lista.length === 0 && <p className={s.suave}>Nenhuma oferta aqui.</p>}

      <div className={s.gradeNegociacoes}>
        {lista.map((oferta) => (
          <CartaoOferta
            key={oferta.id}
            oferta={oferta}
            recebida={aba === "received"}
            virouTroca={dados.ofertasComTroca.has(oferta.id)}
            onMudou={recarregar}
          />
        ))}
      </div>
    </div>
  );
}
