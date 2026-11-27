import { removeCollectionItem, updateCollectionItem } from "../../api/collection";
import { useAcao } from "../../hooks/useAcao";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import { motivoDeNaoApagar } from "../../utils/colecao";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import EditarItemColecao from "../EditarItemColecao/EditarItemColecao";
import s from "../EditarItemColecao/EditarItemColecao.module.css";

export default function EditarVersoesColecao({ carta, versoes, emAndamento, onEmAndamento, onMudou, onAdicionarVersao }) {
  const { pedir } = useConfirmacao();
  const { executar, erro } = useAcao();

  async function remover(item) {
    if (emAndamento) return;
    const comHistorico = item.deleteBlockedBy === "LISTING_HISTORY";
    const confirmou = await pedir({
      titulo: comHistorico ? "Tirar carta da coleção?" : "Remover carta da coleção?",
      mensagem: comHistorico
        ? `${carta.name} ficará com quantidade zero e sairá do seu perfil público. O histórico de anúncios será mantido.`
        : `${carta.name} será removida da sua coleção.`,
      textoConfirmar: comHistorico ? "Tirar da coleção" : "Remover",
      perigo: true,
    });
    if (!confirmou) return;

    onEmAndamento(true);
    const { ok } = await executar(
      () => comHistorico ? updateCollectionItem(item.id, { quantity: 0 }) : removeCollectionItem(item.id),
      comHistorico ? `${carta.name} saiu da coleção.` : `${carta.name} removida da coleção.`,
    );
    onEmAndamento(false);
    if (ok) onMudou();
  }

  return (
    <>
      <fieldset className={s.listaVersoes} disabled={emAndamento}>
        {versoes.map((item) => {
          const descricao = `${variante(item)} · ${CONDICOES[item.condition] ?? item.condition}`;
          const bloqueada = item.deleteBlockedBy !== "LISTING_HISTORY" && Boolean(motivoDeNaoApagar(item.deleteBlockedBy));
          return (
            <section className={s.versao} key={item.id} aria-label={`Versão ${descricao}`}>
              {versoes.length > 1 && <h3>{descricao}</h3>}
              <EditarItemColecao
                item={item}
                onSalvo={onMudou}
                onRemover={() => remover(item)}
                remocaoBloqueada={bloqueada}
                onSalvando={onEmAndamento}
              />
            </section>
          );
        })}
      </fieldset>
      <Aviso erro={erro} />
      <div className={s.acoes}>
        <button className={s.acaoSecundaria} type="button" onClick={onAdicionarVersao} disabled={emAndamento}>
          Adicionar outra versão
        </button>
      </div>
    </>
  );
}
