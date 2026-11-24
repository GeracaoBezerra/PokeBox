import { useEffect, useId, useRef, useState } from "react";
import { Heart, X } from "lucide-react";
import { addToWishlist } from "../../api/wishlist";
import { useSession } from "../../auth/useSession";
import { useAcao } from "../../hooks/useAcao";
import { useMinhasCartas } from "../../hooks/useMinhasCartas";
import v from "../../styles/vitrine.module.css";
import BuscaCartas from "../BuscaCartas/BuscaCartas";
import CartaoAdicionar from "../CartaoAdicionar/CartaoAdicionar";
import s from "./AdicionarWishlist.module.css";

function BuscaWishlist({ itens, onAdicionar, acao, inputRef }) {
  const { minhas } = useMinhasCartas(useSession());
  const cadastradas = new Set([...itens.map((item) => item.cardId), ...(minhas?.naWishlist.keys() ?? [])]);
  const comUnidade = minhas?.comUnidade ?? new Set();

  function botao(carta) {
    if (cadastradas.has(carta.id)) {
      return { texto: "Na wishlist", rotulo: `${carta.name} já está na wishlist`, desativado: true };
    }
    if (comUnidade.has(carta.id)) {
      return { texto: "Você já tem", rotulo: `Você já tem ${carta.name} na coleção`, desativado: true };
    }
    return { texto: "Adicionar", rotulo: `Adicionar ${carta.name} à wishlist`, desativado: false };
  }

  return (
    <BuscaCartas
      botao={botao}
      erro={acao.erro}
      ocupado={acao.ocupado}
      inputRef={inputRef}
      onEscolher={(carta, lang) => onAdicionar(carta.id, lang)}
    />
  );
}

export default function AdicionarWishlist({ botaoRef, itens, onAdicionou }) {
  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(0);
  const dialogo = useRef(null);
  const busca = useRef(null);
  const dialogoId = useId();
  const tituloId = useId();
  const acao = useAcao();

  useEffect(() => {
    const modal = dialogo.current;
    if (!aberto) {
      if (modal.open) modal.close();
      return undefined;
    }
    if (!modal.open) {
      modal.showModal();
      busca.current?.focus();
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [aberto]);

  function fechar() {
    if (!acao.ocupado) setAberto(false);
  }

  async function adicionar(id, lang) {
    const { ok, resultado } = await acao.executar(() => addToWishlist(id, lang), "Carta adicionada à wishlist.");
    if (!ok) return;
    setAberto(false);
    onAdicionou(resultado);
  }

  return (
    <>
      <CartaoAdicionar
        botaoRef={botaoRef}
        titulo="Adicionar carta à wishlist"
        instrucao="Busque no catálogo e salve as cartas que você procura."
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={dialogoId}
        onClick={() => { setSessao((valor) => valor + 1); setAberto(true); }}
      />

      <dialog
        ref={dialogo}
        id={dialogoId}
        className={`${v.modalFiltros} ${s.modal}`}
        aria-labelledby={tituloId}
        onCancel={(evento) => { evento.preventDefault(); fechar(); }}
        onClick={(evento) => { if (evento.target === evento.currentTarget) fechar(); }}
        onClose={() => botaoRef.current?.focus()}
      >
        <header className={v.modalCabecalho}>
          <h2 id={tituloId}><Heart size={20} aria-hidden="true" /> Adicionar à wishlist</h2>
          <button type="button" className={v.fecharModal} aria-label="Fechar" onClick={fechar} disabled={acao.ocupado}>
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className={v.modalConteudo}>
          {sessao > 0 && <BuscaWishlist key={sessao} itens={itens} onAdicionar={adicionar} acao={acao} inputRef={busca} />}
        </div>
      </dialog>
    </>
  );
}
