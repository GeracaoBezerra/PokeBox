import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, PauseCircle, Plus, Store } from "lucide-react";
import { listMyListings } from "../api/listings";
import Abas from "../components/Abas/Abas";
import { idDaAba } from "../components/Abas/idDaAba";
import Atualizando from "../components/Atualizando/Atualizando";
import Aviso from "../components/Aviso/Aviso";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import CarregandoCartas from "../components/CarregandoCartas/CarregandoCartas";
import CartaMeuAnuncio from "../components/CartaMeuAnuncio/CartaMeuAnuncio";
import NovoAnuncio from "../components/NovoAnuncio/NovoAnuncio";
import { useCarregar } from "../hooks/useCarregar";
import s from "../styles/paginas.module.css";
import v from "../styles/vitrine.module.css";
import { ABAS_ANUNCIOS, abaDaUrl, anunciosDaAba, chaveDoAnuncio, contagemPorAba } from "../utils/anuncios";
import m from "./myListings.module.css";

const PAINEL = "painel-anuncios";

const VAZIO = {
  ativos: {
    titulo: "Nenhum anúncio ativo",
    texto: "Anuncie uma carta da sua coleção para receber ofertas de troca.",
    Icone: Store,
  },
  pausados: {
    titulo: "Nenhum anúncio pausado",
    texto: "Pausar tira o anúncio do marketplace sem mexer nas ofertas; ele aparece aqui até você ativar de novo.",
    Icone: PauseCircle,
  },
  encerrados: {
    titulo: "Nenhum anúncio encerrado",
    texto: "Os anúncios que você fechar ou que a moderação bloquear aparecem aqui.",
    Icone: Archive,
  },
};

function SemAnuncios({ aba, onNovo }) {
  const { titulo, texto, Icone } = VAZIO[aba];
  return (
    <div className={v.vazio}>
      <Icone size={32} aria-hidden="true" />
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {aba === "ativos" && (
        <button type="button" className={v.botao} onClick={onNovo}>
          <Plus size={18} aria-hidden="true" /> Novo anúncio
        </button>
      )}
    </div>
  );
}

export default function MyListingsPage() {
  const { dados: anuncios, erro, carregando, primeiraCarga, recarregar } = useCarregar(listMyListings);
  const [params, setParams] = useSearchParams();
  const [criando, setCriando] = useState(false);
  const aba = abaDaUrl(params.get("status"));
  const contagem = anuncios ? contagemPorAba(anuncios) : {};
  const daAba = anuncios ? anunciosDaAba(anuncios, aba) : [];
  const abas = ABAS_ANUNCIOS.map(({ valor, rotulo }) => ({ valor, rotulo, contagem: contagem[valor] }));

  function irPara(valor) {
    const novos = new URLSearchParams(params);
    novos.set("status", valor);
    setParams(novos, { replace: true });
  }

  function criou() {
    setCriando(false);
    irPara("ativos");
    recarregar();
  }

  return (
    <div className={s.pagina}>
      <header className={m.cabecalho}>
        <div className={m.textos}>
          <CabecalhoPagina titulo="Meus anúncios">
            Pausar tira do marketplace sem mexer nas ofertas. Fechar é definitivo e cancela as ofertas abertas. Diminuir a
            quantidade deixa em espera as ofertas que pedem mais do que o novo valor.
          </CabecalhoPagina>
        </div>
        <button type="button" className={v.botao} onClick={() => setCriando(true)}>
          <Plus size={18} aria-hidden="true" /> Novo anúncio
        </button>
      </header>

      <Abas rotulo="Situação dos anúncios" abas={abas} selecionada={aba} onSelecionar={irPara} idPainel={PAINEL} />

      <section id={PAINEL} role="tabpanel" aria-labelledby={idDaAba(PAINEL, aba)} className={m.painel}>
        <Aviso erro={erro} onTentarDeNovo={recarregar} />
        {primeiraCarga && <CarregandoCartas formato="tabela" total={4} />}
        {!primeiraCarga && anuncios && daAba.length === 0 && <SemAnuncios aba={aba} onNovo={() => setCriando(true)} />}
        {!primeiraCarga && daAba.length > 0 && (
          <Atualizando atualizando={carregando}>
            <ul className={m.lista} role="list" aria-label="Lista de anúncios">
              {daAba.map((anuncio) => (
                <li key={chaveDoAnuncio(anuncio)}>
                  <CartaMeuAnuncio anuncio={anuncio} onMudou={recarregar} />
                </li>
              ))}
            </ul>
          </Atualizando>
        )}
      </section>

      <NovoAnuncio aberto={criando} anuncios={anuncios ?? []} onFechar={() => setCriando(false)} onCriado={criou} />
    </div>
  );
}
