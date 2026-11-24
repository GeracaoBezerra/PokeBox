import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowUpRight, ArrowLeftRight, ShieldCheck } from "lucide-react";
import { getListing } from "../api/listings";
import { listMyOffers } from "../api/offers";
import { useSession } from "../auth/useSession";
import AcoesAnuncio from "../components/AcoesAnuncio/AcoesAnuncio";
import Aviso from "../components/Aviso/Aviso";
import DadosAnuncio from "../components/DadosAnuncio/DadosAnuncio";
import FormOferta from "../components/FormOferta/FormOferta";
import PalcoCarta from "../components/PalcoCarta/PalcoCarta";
import PrecoReferencia from "../components/PrecoReferencia/PrecoReferencia";
import ModeracaoAnuncio from "../components/ModeracaoAnuncio/ModeracaoAnuncio";
import { useCarregar } from "../hooks/useCarregar";
import { useMe } from "../hooks/useMe";
import { recursoNaoEncontrado } from "../utils/naoEncontrado";
import { contarOfertasAguardando, textoOfertasAguardando } from "../utils/rotulos";
import s from "../styles/detalheCarta.module.css";
import NotFoundPage from "./notFound";

export default function ListingPage() {
  const { id } = useParams();
  const session = useSession();
  const me = useMe();
  const chave = `${id}|${!!session}`;
  const { dados, erro, carregando, recarregar } = useCarregar(async () => ({ anuncio: await getListing(id), chave }), chave);
  const anuncio = dados?.chave === chave ? dados.anuncio : null;
  const souDono = Boolean(anuncio && me && me.username === anuncio.owner.username);
  const souAdmin = me?.role === "ADMIN";
  const podeOfertar = me && !souDono && anuncio?.status === "ACTIVE";
  const emTroca = anuncio?.status === "IN_TRADE";
  const navigate = useNavigate();
  const location = useLocation();
  const deMarketplace = location.state?.deMarketplace === true;
  const origem = { de: location.pathname + location.search };

  const verificarOferta = Boolean(podeOfertar || (me && !souDono && emTroca));
  const minhas = useCarregar(
    () => (verificarOferta ? listMyOffers("PROPOSED") : Promise.resolve(null)),
    `${id}|${verificarOferta}`
  );
  const verificandoOferta = verificarOferta && minhas.carregando;
  const ofertaAberta = verificarOferta && !minhas.carregando
    ? minhas.dados?.sent?.find((oferta) => oferta.listing?.id === anuncio.id)
    : undefined;

  const anuncioAberto = anuncio?.status === "ACTIVE" || anuncio?.status === "PAUSED";
  const verOfertas = souDono && (anuncioAberto || emTroca);
  const chaveOfertas = verOfertas ? `${anuncio.id}|${anuncio.status}` : "";
  const ofertas = useCarregar(async () => (verOfertas ? listMyOffers("PROPOSED") : null), chaveOfertas);
  const aguardando = ofertas.dados ? contarOfertasAguardando(ofertas.dados.received, anuncio?.id) : null;

  if (recursoNaoEncontrado(erro)) {
    return (
      <NotFoundPage
        titulo="Anúncio não encontrado."
        texto="O anúncio pode ter sido fechado ou o endereço está errado. Veja outras cartas no catálogo ou volte para a página inicial."
      />
    );
  }

  return (
    <div className={s.pagina}>
      <nav className={s.navegacao} aria-label="Navegação do anúncio">
        {deMarketplace ? (
          <button type="button" className={s.voltar} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} aria-hidden="true" /> Voltar ao marketplace
          </button>
        ) : (
          <Link to="/marketplace"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao marketplace</Link>
        )}
        <span>Trocas na comunidade</span>
      </nav>
      {erro ? (
        <section className={s.vazio}>
          <h1>Não foi possível carregar o anúncio</h1><Aviso erro={erro} onTentarDeNovo={recarregar} />
        </section>
      ) : !anuncio ? (
        <div className={s.hero} role="status" aria-label="Carregando anúncio" aria-busy="true">
          <PalcoCarta carregando /><div className={s.resumoSkeleton} aria-hidden="true"><div /><div /><div /></div>
        </div>
      ) : (
        <>
          <div className={s.hero}>
            <PalcoCarta card={anuncio.card} />
            <div className={s.resumo}>
              <DadosAnuncio anuncio={anuncio} />
              <PrecoReferencia card={anuncio.card} />
              {souDono ? (
                <div className={s.convite}>
                  <h2>Este anúncio é seu</h2><p>Acompanhe propostas ou ajuste a disponibilidade da sua carta.</p>
                  <AcoesAnuncio key={anuncio.id} anuncio={anuncio} onMudou={recarregar} />
                  {verOfertas && aguardando !== null && <Link className={s.link} to="/propostas?aba=recebidas&status=PROPOSED">{textoOfertasAguardando(aguardando)}</Link>}
                  {anuncioAberto && <Link className={s.link} to="/anuncios">Editar quantidade e descrição em Meus anúncios</Link>}
                </div>
              ) : emTroca ? (
                <div className={s.convite}>
                  <Aviso erro={minhas.erro} onTentarDeNovo={minhas.recarregar} />
                  {ofertaAberta ? (
                    <>
                      <h2>Você já fez uma oferta aqui</h2>
                      <p>Este anúncio está em troca no momento. Se a troca não acontecer, sua oferta volta a valer.</p>
                      <Link className={s.link} to="/propostas?aba=enviadas">Ver em Propostas</Link>
                    </>
                  ) : verificandoOferta ? (
                    <p className={s.suave} role="status">Verificando suas ofertas…</p>
                  ) : (
                    <>
                      <h2>Este anúncio está em troca no momento.</h2>
                      <p>Você pode explorar outras cartas na comunidade.</p>
                      <Link className={s.link} to="/marketplace">Ver outros anúncios</Link>
                    </>
                  )}
                </div>
              ) : podeOfertar ? (
                <div className={s.convite}>
                  <Aviso erro={minhas.erro} onTentarDeNovo={minhas.recarregar} />
                  {ofertaAberta ? (
                    <>
                      <h2>Você já fez uma oferta aqui</h2>
                      <Link className={s.link} to="/propostas?aba=enviadas">Ver em Propostas</Link>
                    </>
                  ) : verificandoOferta ? (
                    <p className={s.suave} role="status">Verificando suas ofertas…</p>
                  ) : (
                    <>
                      <h2>Vamos fazer uma troca?</h2><p>Escolha cartas da sua coleção e envie uma proposta para @{anuncio.owner.username}.</p>
                      <a className={s.botao} href="#fazer-oferta"><ArrowLeftRight size={18} aria-hidden="true" /> Fazer uma oferta <ArrowDown size={16} aria-hidden="true" /></a>
                    </>
                  )}
                </div>
              ) : !session ? (
                <div className={s.convite}>
                  <h2>Encontre sua próxima troca</h2><p>Entre na sua conta para oferecer cartas da sua coleção.</p>
                  <div className={s.acoes}><Link className={s.botao} to="/login" state={origem}>Entrar para negociar</Link><Link className={s.link} to="/register" state={origem}>Criar uma conta</Link></div>
                </div>
              ) : !me ? (
                <p className={s.suave} role="status">Validando sua sessão para negociar…</p>
              ) : (
                <div className={s.convite}><h2>Anúncio indisponível para ofertas</h2><p>Você pode explorar outras cartas na comunidade.</p><Link className={s.link} to="/marketplace">Ver outros anúncios</Link></div>
              )}
              <Link className={s.link} to={`/cards/${encodeURIComponent(anuncio.card.id)}`}>Conhecer todos os detalhes da carta <ArrowUpRight size={16} aria-hidden="true" /></Link>
              {souAdmin && !souDono && <ModeracaoAnuncio key={id} anuncio={anuncio} onMudou={recarregar} atualizando={carregando} />}
            </div>
          </div>
          <div className={s.notaTroca}><ShieldCheck size={20} aria-hidden="true" /><p>A oferta inicia a conversa. Quando o dono aceita, a troca nasce e as cartas ficam reservadas até os dois confirmarem o recebimento.</p></div>
          {podeOfertar && !verificandoOferta && !ofertaAberta && <FormOferta key={id} anuncio={anuncio} />}
        </>
      )}
    </div>
  );
}
