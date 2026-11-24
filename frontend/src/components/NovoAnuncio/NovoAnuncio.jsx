import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, PackageOpen, Plus } from "lucide-react";
import { listCollection } from "../../api/collection";
import { createListing } from "../../api/listings";
import { errosPorCampo } from "../../api/mensagens";
import { useAcao } from "../../hooks/useAcao";
import { useCarregar } from "../../hooks/useCarregar";
import p from "../../styles/paginas.module.css";
import v from "../../styles/vitrine.module.css";
import { livresParaAnunciar } from "../../utils/anuncios";
import { filtrarPorNome } from "../../utils/oferta";
import { CONDICOES, variante } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import CampoBusca from "../CampoBusca/CampoBusca";
import FormNovoAnuncio from "../FormNovoAnuncio/FormNovoAnuncio";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import ModalColecao from "../ModalColecao/ModalColecao";
import s from "./NovoAnuncio.module.css";

function textoLivres(livre) {
  return `${livre} ${livre === 1 ? "disponível" : "disponíveis"}`;
}

function EscolherItem({ itens, onEscolher }) {
  const [busca, setBusca] = useState("");
  const lista = useRef(null);
  const filtrados = filtrarPorNome(itens, busca);

  useEffect(() => {
    lista.current?.querySelector("input")?.focus();
  }, []);

  return (
    <div className={s.passo} ref={lista}>
      <CampoBusca rotulo="Buscar na sua coleção" valor={busca} placeholder="Nome da carta" imediato onMudar={setBusca} />
      <p className={s.suave} aria-live="polite">
        {filtrados.length === 0
          ? "Nenhuma carta disponível com esse nome."
          : `${filtrados.length} ${filtrados.length === 1 ? "carta disponível" : "cartas disponíveis"} para anunciar`}
      </p>
      <ul className={s.itens} role="list" aria-label="Cartas da sua coleção">
        {filtrados.map((item) => {
          const detalhes = `${variante(item)} · ${CONDICOES[item.condition] ?? item.condition}`;
          return (
            <li key={item.id} className={s.item}>
              <div className={s.miniatura}>
                <ImagemCarta src={item.card.imageUrl} alt="" />
              </div>
              <div className={s.dados}>
                <strong>{item.card.name}</strong>
                <span>{detalhes}</span>
                <span>{textoLivres(item.livre)}</span>
              </div>
              <button
                type="button"
                className={p.botaoSecundario}
                aria-label={`Escolher ${item.card.name} (${detalhes})`}
                onClick={() => onEscolher(item)}
              >
                Escolher
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Detalhes({ item, onVoltar, onCriado }) {
  const { erro, ocupado, executar } = useAcao();

  async function criar(dados) {
    const { ok } = await executar(() => createListing({ collectionItemId: item.id, ...dados }), "Anúncio criado.");
    if (ok) onCriado();
  }

  return (
    <div className={s.passo}>
      <div className={s.escolhida}>
        <p>
          <strong>{item.card.name}</strong>
          <span>
            {variante(item)} · {CONDICOES[item.condition] ?? item.condition} · {textoLivres(item.livre)}
          </span>
        </p>
        <button type="button" className={s.trocar} onClick={onVoltar} disabled={ocupado}>
          <ArrowLeft size={16} aria-hidden="true" /> Trocar carta
        </button>
      </div>
      <FormNovoAnuncio disponivel={item.livre} ocupado={ocupado} onCriar={criar} erros={errosPorCampo(erro?.details)} />
      <Aviso erro={erro} campos={["quantity", "description"]} />
    </div>
  );
}

function Passos({ anuncios, onCriado }) {
  const colecao = useCarregar(listCollection);
  const [escolhido, setEscolhido] = useState(null);

  if (colecao.primeiraCarga) {
    return (
      <p className={s.suave} role="status">
        Carregando sua coleção…
      </p>
    );
  }
  if (!colecao.dados) return <Aviso erro={colecao.erro} onTentarDeNovo={colecao.recarregar} />;

  const itens = livresParaAnunciar(colecao.dados, anuncios);

  if (itens.length === 0) {
    return (
      <div className={v.vazio}>
        <PackageOpen size={32} aria-hidden="true" />
        <h2>Você não tem cartas disponíveis para anunciar</h2>
        <p>Adicione cartas à sua coleção. As que já estão em outro anúncio ou numa troca não entram aqui.</p>
        <Link className={v.botao} to="/colecao">
          Ir para a coleção
        </Link>
      </div>
    );
  }

  if (escolhido) return <Detalhes item={escolhido} onVoltar={() => setEscolhido(null)} onCriado={onCriado} />;
  return <EscolherItem itens={itens} onEscolher={setEscolhido} />;
}

export default function NovoAnuncio({ aberto, anuncios, onFechar, onCriado }) {
  return (
    <ModalColecao aberto={aberto} larga titulo="Novo anúncio" icone={<Plus size={20} aria-hidden="true" />} onFechar={onFechar}>
      <Passos anuncios={anuncios} onCriado={onCriado} />
    </ModalColecao>
  );
}
