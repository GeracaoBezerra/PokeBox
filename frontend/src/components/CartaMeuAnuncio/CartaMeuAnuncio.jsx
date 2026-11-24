import { useId } from "react";
import { Link } from "react-router-dom";
import { Archive, Pause, Pencil, Play } from "lucide-react";
import { updateListing } from "../../api/listings";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import { avisarQuePendenciasMudaram } from "../../hooks/usePendencias";
import g from "../../styles/cartaGrade.module.css";
import { editavel } from "../../utils/anuncios";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../../utils/rotulos";
import botoes from "../AcoesRapidas/AcoesRapidas.module.css";
import Aviso from "../Aviso/Aviso";
import legenda from "../CartaAnuncio/CartaAnuncio.module.css";
import CartaCard from "../CartaCard/CartaCard";

const SELOS = {
  IN_TRADE: { texto: STATUS_ANUNCIO.IN_TRADE, tom: "aviso" },
  PAUSED: { texto: STATUS_ANUNCIO.PAUSED, tom: "info" },
  BLOCKED: { texto: STATUS_ANUNCIO.BLOCKED, tom: "erro" },
  CLOSED: { texto: STATUS_ANUNCIO.CLOSED },
};

const NOTAS = {
  BLOCKED: "Se a moderação desbloquear, ele volta como pausado.",
  CLOSED: "Não pode ser reaberto.",
};

function notaDoAnuncio(anuncio) {
  if (anuncio.status === "PAUSED" && anuncio.quantity === 0) return "Sem unidades: edite a quantidade para reativar.";
  return NOTAS[anuncio.status] ?? null;
}

function detalhesDoAnuncio(anuncio) {
  return [
    ["Variante", variante(anuncio.item)],
    ["Condição", CONDICOES[anuncio.item.condition] ?? anuncio.item.condition],
    ["Para troca", anuncio.quantity],
    ["Situação", STATUS_ANUNCIO[anuncio.status] ?? anuncio.status],
    ["Criado em", formatarData(anuncio.createdAt)],
  ];
}

export default function CartaMeuAnuncio({ anuncio, onEditar, onMudou }) {
  const tituloId = useId();
  const notaId = useId();
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const { card, item } = anuncio;
  const destino = `/marketplace/${anuncio.id}`;
  const selo = SELOS[anuncio.status];
  const nota = notaDoAnuncio(anuncio);
  const aberto = editavel(anuncio) || anuncio.status === "IN_TRADE";
  const emTroca = anuncio.status === "IN_TRADE";

  async function mudar(status, mensagem) {
    const { ok } = await acao.executar(() => updateListing(anuncio.id, { status }), mensagem);
    if (!ok) return;
    if (status === "CLOSED") avisarQuePendenciasMudaram();
    onMudou();
  }

  async function fechar() {
    const confirmou = await pedir({
      titulo: "Fechar anúncio?",
      mensagem: "Não dá para reabrir. As ofertas abertas serão canceladas; as trocas em andamento continuam.",
      textoConfirmar: "Fechar anúncio",
      perigo: true,
    });
    if (confirmou) mudar("CLOSED", "Anúncio fechado.");
  }

  return (
    <article className={g.cartao} aria-labelledby={tituloId} data-status={anuncio.status} data-cy="meu-anuncio">
      <CartaCard carta={{ ...card, illustrator: null }} link={destino} detalhes={detalhesDoAnuncio(anuncio)} />
      <div className={g.topo}>
        <div className={legenda.legenda}>
          {selo && (
            <div className={legenda.selos}>
              <span className={g.selo} data-tom={selo.tom}>
                {selo.texto}
              </span>
            </div>
          )}
          <h2 id={tituloId} className={g.nome}>
            <Link to={destino} className={legenda.nome}>
              {card.name}
            </Link>
          </h2>
          <span className={legenda.suave}>
            {variante(item)} · {CONDICOES[item.condition] ?? item.condition}
          </span>
          {aberto && (
            <span className={legenda.suave}>{emTroca ? "Em negociação" : `${anuncio.quantity} para troca`}</span>
          )}
          {nota && (
            <p id={notaId} className={g.nota}>
              {nota}
            </p>
          )}
        </div>
        {aberto && (
          <button
            type="button"
            className={g.secundaria}
            aria-label="Fechar"
            aria-describedby={tituloId}
            title="Fechar anúncio"
            disabled={acao.ocupado}
            onClick={fechar}
          >
            <Archive size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {aberto && (
        <div className={`${botoes.acoes} ${g.acoes}`}>
          {editavel(anuncio) && (
            <button type="button" className={botoes.botao} aria-describedby={tituloId} onClick={() => onEditar(anuncio)}>
              <Pencil size={18} aria-hidden="true" />
              Editar
            </button>
          )}
          {anuncio.status === "PAUSED" ? (
            <button
              type="button"
              className={botoes.botao}
              aria-describedby={nota ? notaId : tituloId}
              disabled={acao.ocupado || anuncio.quantity === 0}
              onClick={() => mudar("ACTIVE", "Anúncio ativado.")}
            >
              <Play size={18} aria-hidden="true" />
              Ativar
            </button>
          ) : (
            <button
              type="button"
              className={botoes.botao}
              aria-describedby={tituloId}
              disabled={acao.ocupado}
              onClick={() => mudar("PAUSED", "Anúncio pausado.")}
            >
              <Pause size={18} aria-hidden="true" />
              Pausar
            </button>
          )}
        </div>
      )}
      <Aviso erro={acao.erro} />
    </article>
  );
}
