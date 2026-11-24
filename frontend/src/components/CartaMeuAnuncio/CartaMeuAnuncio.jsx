import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { updateListing } from "../../api/listings";
import { errosPorCampo } from "../../api/mensagens";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import p from "../../styles/paginas.module.css";
import { editavel, mudancasDoAnuncio } from "../../utils/anuncios";
import { quantidadeValida } from "../../utils/colecao";
import { CONDICOES, STATUS_ANUNCIO, formatarData, variante } from "../../utils/rotulos";
import AcoesAnuncio from "../AcoesAnuncio/AcoesAnuncio";
import Aviso from "../Aviso/Aviso";
import ErroCampo from "../ErroCampo/ErroCampo";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import s from "./CartaMeuAnuncio.module.css";

const SELOS = {
  ACTIVE: { texto: STATUS_ANUNCIO.ACTIVE, tom: "ativo" },
  IN_TRADE: { texto: STATUS_ANUNCIO.IN_TRADE, tom: "troca" },
  PAUSED: { texto: STATUS_ANUNCIO.PAUSED, tom: "pausado" },
  CLOSED: { texto: STATUS_ANUNCIO.CLOSED, tom: "encerrado" },
  BLOCKED: { texto: "Bloqueado pela moderação", tom: "bloqueado" },
};

const EXPLICACOES = {
  IN_TRADE: "Todas as unidades estão numa troca em andamento. Se a troca for desfeita, o anúncio volta a ficar ativo.",
  BLOCKED: "Ele saiu do marketplace e as ofertas foram canceladas. Se a moderação desbloquear, ele volta como pausado.",
  CLOSED: "Este anúncio foi fechado e não pode ser reaberto.",
};

function plural(quantidade, singular, varias) {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`;
}

function Edicao({ anuncio, acao, onMudou }) {
  const [form, setForm] = useState({ quantity: anuncio.quantity, description: anuncio.description ?? "" });
  const { pedir } = useConfirmacao();
  const id = useId();
  const nome = anuncio.card.name;
  const valida = quantidadeValida(form.quantity);
  const mudancas = mudancasDoAnuncio(anuncio, form);
  const mudou = Object.keys(mudancas).length > 0;
  const erros = errosPorCampo(acao.erro?.details);
  const erroQuantidade = valida ? erros.quantity : "A quantidade mínima é 1.";
  const semUnidades = anuncio.status === "PAUSED" && anuncio.quantity === 0;

  async function salvar(evento) {
    evento.preventDefault();
    if (!valida || !mudou) return;
    if (mudancas.quantity != null && mudancas.quantity < anuncio.quantity) {
      const confirmou = await pedir({
        titulo: "Diminuir a quantidade?",
        mensagem: `O anúncio de ${nome} passa de ${anuncio.quantity} para ${mudancas.quantity}. As ofertas que pedem mais de ${plural(mudancas.quantity, "unidade", "unidades")} ficam em espera até o anúncio ter quantidade suficiente de novo.`,
        textoConfirmar: "Diminuir",
      });
      if (!confirmou) return;
    }
    const { ok } = await acao.executar(() => updateListing(anuncio.id, mudancas), "Anúncio atualizado.");
    if (ok) onMudou();
  }

  return (
    <form className={s.edicao} onSubmit={salvar} noValidate>
      {semUnidades && (
        <p id={`${id}-sem-unidades`} className={s.alerta}>
          Este anúncio ficou sem unidades depois de uma troca. Informe a quantidade e salve para poder reativar.
        </p>
      )}
      <div className={s.campos}>
        <div>
          <label className={p.campo}>
            Quantidade
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              aria-label={`Quantidade do anúncio de ${nome}`}
              aria-invalid={Boolean(erroQuantidade)}
              aria-describedby={erroQuantidade ? `${id}-quantidade` : semUnidades ? `${id}-sem-unidades` : undefined}
              onChange={(evento) => setForm({ ...form, quantity: evento.target.value })}
            />
          </label>
          <ErroCampo id={`${id}-quantidade`} mensagem={erroQuantidade} />
        </div>
        <div>
          <label className={p.campo}>
            Descrição
            <input
              value={form.description}
              maxLength={500}
              placeholder="Opcional"
              aria-label={`Descrição do anúncio de ${nome}`}
              aria-invalid={Boolean(erros.description)}
              aria-describedby={erros.description ? `${id}-descricao` : undefined}
              onChange={(evento) => setForm({ ...form, description: evento.target.value })}
            />
          </label>
          <ErroCampo id={`${id}-descricao`} mensagem={erros.description} />
        </div>
      </div>
      <button type="submit" className={p.botao} disabled={!mudou || !valida || acao.ocupado}>
        {acao.ocupado ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}

function Leitura({ anuncio }) {
  return (
    <dl className={s.numeros}>
      <div>
        <dt>Quantidade</dt>
        <dd>{anuncio.quantity}</dd>
      </div>
      <div className={s.descricao}>
        <dt>Descrição</dt>
        <dd>{anuncio.description || "Sem descrição"}</dd>
      </div>
    </dl>
  );
}

export default function CartaMeuAnuncio({ anuncio, onMudou }) {
  const tituloId = useId();
  const acao = useAcao();
  const { card, item } = anuncio;
  const link = `/marketplace/${anuncio.id}`;
  const selo = SELOS[anuncio.status] ?? { texto: STATUS_ANUNCIO[anuncio.status] ?? anuncio.status, tom: "encerrado" };
  const aberto = editavel(anuncio) || anuncio.status === "IN_TRADE";
  const explicacao = EXPLICACOES[anuncio.status];

  return (
    <article className={s.cartao} aria-labelledby={tituloId} data-status={anuncio.status} data-cy="meu-anuncio">
      <div className={s.topo}>
        <Link className={s.imagem} to={link} tabIndex={-1} aria-hidden="true">
          <ImagemCarta src={card.imageUrl} alt="" />
        </Link>
        <div className={s.identidade}>
          <h2 id={tituloId} className={s.nome}>
            <Link to={link}>{card.name}</Link>
          </h2>
          <p className={s.variante}>
            {variante(item)} · {CONDICOES[item.condition] ?? item.condition}
          </p>
          <span className={s.selo} data-tom={selo.tom}>
            {selo.texto}
          </span>
          <p className={s.suave}>Criado em {formatarData(anuncio.createdAt)}</p>
        </div>
      </div>
      {explicacao && <p className={s.explicacao}>{explicacao}</p>}
      {editavel(anuncio) ? <Edicao anuncio={anuncio} acao={acao} onMudou={onMudou} /> : <Leitura anuncio={anuncio} />}
      {aberto && <AcoesAnuncio anuncio={anuncio} onMudou={onMudou} acao={acao} />}
      <Aviso erro={acao.erro} campos={["quantity", "description"]} />
    </article>
  );
}
