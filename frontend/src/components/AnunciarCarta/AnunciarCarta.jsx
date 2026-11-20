import { useState } from "react";
import { listCollection } from "../../api/collection";
import { createListing } from "../../api/listings";
import { errosPorCampo } from "../../api/mensagens";
import { useAcao } from "../../hooks/useAcao";
import { useCarregar } from "../../hooks/useCarregar";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import FormNovoAnuncio from "../FormNovoAnuncio/FormNovoAnuncio";

export default function AnunciarCarta({ card, onCriado }) {
  const { dados, carregando, erro } = useCarregar(listCollection);
  const acao = useAcao();
  const [escolhidoId, setEscolhidoId] = useState(null);

  if (carregando) return <p>Carregando…</p>;
  if (erro) return <Aviso erro={erro} />;

  const itens = (dados ?? []).filter(
    (item) => String(item.cardId) === String(card.id) && item.available > 0
  );

  if (itens.length === 0) {
    return <p>Todas as suas cópias desta carta estão reservadas em trocas.</p>;
  }

  const itemEscolhido =
    itens.find((item) => String(item.id) === String(escolhidoId)) ?? itens[0];

  async function criar(anuncio) {
    const { ok } = await acao.executar(
      () => createListing({ collectionItemId: itemEscolhido.id, ...anuncio }),
      "Anúncio criado."
    );
    if (ok) onCriado();
  }

  return (
    <div>
      {itens.length === 1 ? (
        <p>
          {variante(itemEscolhido)} · {CONDICOES[itemEscolhido.condition]}
        </p>
      ) : (
        <label>
          Qual cópia?
          <select
            value={itemEscolhido.id}
            onChange={(e) => setEscolhidoId(e.target.value)}
          >
            {itens.map((item) => (
              <option key={item.id} value={item.id}>
                {variante(item)} · {CONDICOES[item.condition]} · {item.available}{" "}
                {item.available === 1 ? "livre" : "livres"}
              </option>
            ))}
          </select>
        </label>
      )}

      <FormNovoAnuncio
        key={itemEscolhido.id}
        disponivel={itemEscolhido.available}
        ocupado={acao.ocupado}
        onCriar={criar}
        erros={errosPorCampo(acao.erro?.details)}
      />
      <Aviso erro={acao.erro} campos={["quantity", "description"]} />
    </div>
  );
}
