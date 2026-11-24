import { useId, useState } from "react";
import { updateListing } from "../../api/listings";
import { errosPorCampo } from "../../api/mensagens";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import s from "../../styles/detalheCarta.module.css";
import { mudancasDoAnuncio } from "../../utils/anuncios";
import { quantidadeValida } from "../../utils/colecao";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import ErroCampo from "../ErroCampo/ErroCampo";
import e from "../EditarItemColecao/EditarItemColecao.module.css";
import a from "./EditarAnuncio.module.css";

function plural(quantidade, singular, varias) {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`;
}

export default function EditarAnuncio({ anuncio, onSalvo }) {
  const [form, setForm] = useState({ quantity: anuncio.quantity, description: anuncio.description ?? "" });
  const { erro, ocupado, executar } = useAcao();
  const { pedir } = useConfirmacao();
  const id = useId();
  const nome = anuncio.card.name;
  const valida = quantidadeValida(form.quantity);
  const mudancas = mudancasDoAnuncio(anuncio, form);
  const mudou = Object.keys(mudancas).length > 0;
  const erros = errosPorCampo(erro?.details);
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
    const { ok } = await executar(() => updateListing(anuncio.id, mudancas), "Anúncio atualizado.");
    if (ok) onSalvo();
  }

  return (
    <form className={`${s.formulario} ${e.formulario}`} onSubmit={salvar} noValidate>
      <p className={s.suave}>
        {nome} · {variante(anuncio.item)} · {CONDICOES[anuncio.item.condition] ?? anuncio.item.condition}
      </p>
      {semUnidades && (
        <p id={`${id}-sem-unidades`} className={a.alerta}>
          Este anúncio ficou sem unidades depois de uma troca. Informe a quantidade e salve para poder reativar.
        </p>
      )}
      <div>
        <label className={s.campo}>
          Quantidade para troca
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
        <label className={`${s.campo} ${a.descricao}`}>
          Descrição
          <textarea
            rows={3}
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
      <button type="submit" className={s.botao} disabled={!mudou || !valida || ocupado}>
        {ocupado ? "Salvando…" : "Salvar"}
      </button>
      <Aviso erro={erro} campos={["quantity", "description"]} />
    </form>
  );
}
