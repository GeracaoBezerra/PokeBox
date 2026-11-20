import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import { listWishlist, removeFromWishlist } from "../api/wishlist";
import AdicionarWishlist from "../components/AdicionarWishlist/AdicionarWishlist";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import GradeCartas, { ItemGrade } from "../components/GradeCartas/GradeCartas";
import ItemWishlist from "../components/ItemWishlist/ItemWishlist";
import { useAcao } from "../hooks/useAcao";
import { useCarregar } from "../hooks/useCarregar";
import { useConfirmacao } from "../hooks/useConfirmacao";
import s from "../styles/paginas.module.css";

const porNome = new Intl.Collator("pt-BR");

function podeAnimar(elemento) {
  return typeof elemento?.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function WishlistPage() {
  const { dados, erro, carregando, recarregar } = useCarregar(listWishlist);
  const [itensAtualizados, setItensAtualizados] = useState(null);
  const itens = itensAtualizados ?? dados;
  const acao = useAcao();
  const { pedir } = useConfirmacao();
  const grade = useRef(null);
  const adicionar = useRef(null);

  function atualizarGrade(atualizar) {
    const elemento = grade.current;
    const atualizarItens = () => setItensAtualizados((atuais) => atualizar(atuais ?? dados));
    if (!podeAnimar(elemento)) {
      atualizarItens();
      return;
    }

    const posicoes = new Map(Array.from(elemento.children, (item) => [item, item.getBoundingClientRect()]));
    for (const item of posicoes.keys()) item.getAnimations().forEach((animacao) => animacao.cancel());
    flushSync(atualizarItens);
    for (const item of elemento.children) {
      const anterior = posicoes.get(item);
      if (!anterior) {
        item.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], 240);
        continue;
      }
      const atual = item.getBoundingClientRect();
      const x = anterior.left - atual.left;
      const y = anterior.top - atual.top;
      if (x || y) item.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], { duration: 240, easing: "ease-out" });
    }
  }

  async function remover(item, elemento) {
    const confirmou = await pedir({
      titulo: `Remover ${item.card.name} da wishlist?`,
      textoConfirmar: "Remover carta",
      perigo: true,
    });
    if (!confirmou) return;

    await acao.executar(async () => {
      await removeFromWishlist(item.id);
      if (elemento?.isConnected && podeAnimar(elemento)) {
        const saida = elemento.animate(
          [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.96)" }],
          { duration: 180, easing: "ease-in", fill: "forwards" },
        );
        await saida.finished.catch(() => {});
      }
      const foco = document.activeElement;
      if (elemento?.contains(foco) || foco === document.body) adicionar.current?.focus();
      atualizarGrade((atuais) => atuais.filter((atual) => atual.id !== item.id));
    }, `${item.card.name} saiu da wishlist.`, { tipo: "aviso" });
  }

  function adicionou(item) {
    atualizarGrade((atuais) => [item, ...atuais.filter((atual) => atual.id !== item.id)]
      .sort((a, b) => porNome.compare(a.card.name, b.card.name)));
  }

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Wishlist">
        Cartas que você procura. As oportunidades indicam quantos outros colecionadores têm a carta pública e disponível.
      </CabecalhoPagina>

      <Aviso erro={erro} onTentarDeNovo={recarregar} />
      <Aviso erro={acao.erro} />
      {carregando && <CarregandoCartas />}
      {!carregando && itens && itens.length === 0 && <p className={s.suave}>Sua wishlist está vazia.</p>}

      {!carregando && itens && (
        <GradeCartas ref={grade}>
          <ItemGrade>
            <AdicionarWishlist botaoRef={adicionar} itens={itens} onAdicionou={adicionou} />
          </ItemGrade>
          {itens.map((item) => (
            <ItemGrade key={item.id}>
              <ItemWishlist item={item} ocupado={acao.ocupado} onRemover={remover} />
            </ItemGrade>
          ))}
        </GradeCartas>
      )}
    </div>
  );
}
