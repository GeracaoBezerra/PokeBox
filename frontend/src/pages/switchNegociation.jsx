import { useState } from "react";
import { Link } from "react-router-dom";
import { acceptTrade, cancelTrade, listMyTrades, rejectTrade } from "../api/trades";
import Aviso from "../components/Aviso/Aviso";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import { CONDICOES, STATUS_TROCA, formatarData, variante } from "../utils/rotulos";
import ImagemCarta from "../components/ImagemCarta/ImagemCarta";

function Lado({ titulo, itens }) {
  return (
    <div>
      <div className={s.suave}>{titulo}</div>
      <div className={s.linhaCartas}>
        {itens.map((item, indice) => (
          <Link key={`${item.card.id}-${indice}`} to={`/cards/${item.card.id}`} title={item.card.name}>
            <ImagemCarta className={s.miniatura} src={item.card.imageUrl} alt={item.card.name} />
            <div className={s.suave}>
              {item.quantity}× {item.card.name}
            </div>
            <div className={s.suave}>
              {variante(item)} · {CONDICOES[item.condition]}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CartaoTroca({ troca, souDonoDoAnuncio, onMudou }) {
  const acao = useAcao();
  const parceiro = souDonoDoAnuncio ? troca.proposer : troca.recipient;
  const eu = souDonoDoAnuncio ? troca.recipient : troca.proposer;
  const dou = troca.items.filter((item) => item.from === eu.username);
  const recebo = troca.items.filter((item) => item.to === eu.username);
  const emAndamento = troca.status === "PROPOSED";

  async function agir(fn, mensagem) {
    const { ok } = await acao.executar(() => fn(troca.id), mensagem);
    if (ok) onMudou();
  }

  return (
    <div className={s.cartaoNegociacao}>
      <div className={s.acoes}>
        <span className={s.status}>{STATUS_TROCA[troca.status]}</span>
        <span className={s.suave}>
          com @{parceiro.username} · criada em {formatarData(troca.createdAt)}
          {troca.completedAt && ` · finalizada em ${formatarData(troca.completedAt)}`}
        </span>
      </div>

      <div className={s.linhaCartas}>
        <Lado titulo="Você dá" itens={dou} />
        <span aria-hidden="true">⇄</span>
        <Lado titulo="Você recebe" itens={recebo} />
      </div>

      <div className={s.acoes}>
        {souDonoDoAnuncio && emAndamento && (
          <>
            <button
              className={s.botao}
              disabled={acao.ocupado}
              onClick={() => agir(acceptTrade, "Troca concluída: as cartas mudaram de dono.")}
            >
              Concluir troca
            </button>
            <button
              className={s.botaoPerigo}
              disabled={acao.ocupado}
              onClick={() => agir(rejectTrade, "Troca recusada. A reserva foi liberada.")}
            >
              Recusar
            </button>
          </>
        )}
        {!souDonoDoAnuncio && emAndamento && (
          <button
            className={s.botaoPerigo}
            disabled={acao.ocupado}
            onClick={() => agir(cancelTrade, "Troca cancelada. A reserva foi liberada.")}
          >
            Cancelar troca
          </button>
        )}
        {!souDonoDoAnuncio && emAndamento && (
          <span className={s.suave}>Aguardando @{parceiro.username} concluir.</span>
        )}
      </div>
      <Aviso erro={acao.erro} sucesso={acao.sucesso} />
    </div>
  );
}

export default function SwitchNegociationPage() {
  const [aba, setAba] = useState("received");
  const [status, setStatus] = useState("");
  const { dados, erro, carregando, recarregar } = useCarregar(() => listMyTrades(status), status);

  const lista = dados?.[aba] ?? [];

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Trocas</h1>
      <p className={s.subtitulo}>
        Recebidas: trocas nos seus anúncios (você conclui ou recusa). Enviadas: trocas que você criou a partir de uma
        oferta aceita (você pode cancelar). Enquanto a troca está em andamento, as cartas ficam reservadas.
      </p>

      <div className={s.abas}>
        <button className={aba === "received" ? s.abaAtiva : s.aba} onClick={() => setAba("received")}>
          Recebidas {dados ? `(${dados.received.length})` : ""}
        </button>
        <button className={aba === "sent" ? s.abaAtiva : s.aba} onClick={() => setAba("sent")}>
          Enviadas {dados ? `(${dados.sent.length})` : ""}
        </button>
        <label className={s.campo}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_TROCA).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Aviso erro={erro} />
      {carregando && !dados && <p className={s.suave}>Carregando...</p>}
      {dados && lista.length === 0 && <p className={s.suave}>Nenhuma troca aqui.</p>}

      <div className={s.grade} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {lista.map((troca) => (
          <CartaoTroca key={troca.id} troca={troca} souDonoDoAnuncio={aba === "received"} onMudou={recarregar} />
        ))}
      </div>
    </div>
  );
}
