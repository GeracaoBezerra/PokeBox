import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowDown } from "lucide-react";
import { getCard } from "../api/cards";
import { useSession } from "../auth/useSession";
import AnunciosDaCarta from "../components/AnunciosDaCarta/AnunciosDaCarta";
import Aviso from "../components/Aviso/Aviso";
import DadosCarta from "../components/DadosCarta/DadosCarta";
import FormColecao from "../components/FormColecao/FormColecao";
import PalcoCarta from "../components/PalcoCarta/PalcoCarta";
import VoceEACarta from "../components/VoceEACarta/VoceEACarta";
import { useCarregar } from "../hooks/useCarregar";
import { IDIOMA_PADRAO, buscarComReserva } from "../utils/idioma";
import s from "../styles/detalheCarta.module.css";

export default function CardPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const langPedido = params.get("lang") ?? "";
  const session = useSession();
  const chave = `${id}|${langPedido}|${!!session}`;
  const { dados: resposta, erro, carregando, recarregar } = useCarregar(async () => ({
    ...await buscarComReserva((idioma) => getCard(id, idioma), langPedido),
    chave,
  }), chave);
  const atual = resposta?.chave === chave;
  const dados = resposta?.dados;
  const lang = (atual && resposta.lang) || langPedido || IDIOMA_PADRAO;
  const catalogo = `/catalogo?lang=${encodeURIComponent(lang)}`;

  return (
    <div className={s.pagina}>
      <nav className={s.navegacao} aria-label="Navegação da carta">
        <Link to={catalogo}><ArrowLeft size={16} aria-hidden="true" /> Voltar ao catálogo</Link>
        <span>Pokémon TCG</span>
      </nav>
      {erro ? (
        <section className={s.vazio}>
          <h1>Não foi possível carregar a carta</h1>
          <Aviso erro={erro} onTentarDeNovo={recarregar} />
        </section>
      ) : (!dados || !atual) ? (
        <div className={s.hero} role="status" aria-label="Carregando carta" aria-busy="true">
          <PalcoCarta carregando />
          <div className={s.resumoSkeleton} aria-hidden="true"><div /><div /><div /></div>
        </div>
      ) : (
        <>
          <div className={s.hero}>
            <PalcoCarta key={`${id}|${lang}`} card={dados.card} />
            <div className={s.resumo}>
              {resposta.reserva && <p className={s.avisoIdioma} role="status">Esta carta não tem versão em português; mostrando em inglês.</p>}
              <DadosCarta card={dados.card} />
              <a className={s.botaoSecundario} href="#anuncios-carta">Ver anúncios de troca ({dados.listings.length}) <ArrowDown size={16} aria-hidden="true" /></a>
              {dados.user ? (
                <>
                  <VoceEACarta key={id} card={dados.card} lang={lang} user={dados.user} onMudou={recarregar} atualizando={carregando} />
                  <details className={s.adicionar} key={`${id}|${lang}`}>
                    <summary>Adicionar à minha coleção <span aria-hidden="true">+</span></summary>
                    <FormColecao card={dados.card} lang={lang} onAdicionado={recarregar} />
                  </details>
                </>
              ) : (
                <div className={s.convite}>
                  <h2>Sua próxima carta começa aqui</h2>
                  <p>Entre para guardar na coleção, adicionar à wishlist e negociar com outros colecionadores.</p>
                  <div className={s.acoes}><Link className={s.botao} to="/login">Entrar na minha conta</Link><Link className={s.link} to="/register">Criar uma conta</Link></div>
                </div>
              )}
            </div>
          </div>
          <section className={s.secao} aria-labelledby="sobre-carta">
            <header className={s.cabecalho}><span className={s.eyebrow}>Conheça a carta</span><h2 id="sobre-carta">Detalhes e habilidades</h2></header>
            <div className={s.detalhes}>
              <div className={s.painel}>
                <h3>Sobre esta edição</h3>
                <dl className={s.ficha}>
                  <div><dt>Categoria</dt><dd>{dados.card.category}</dd></div>
                  {dados.card.stage && <div><dt>Estágio</dt><dd>{dados.card.stage}</dd></div>}
                  {dados.card.illustrator && <div><dt>Ilustração</dt><dd>{dados.card.illustrator}</dd></div>}
                  {dados.card.set?.series && <div><dt>Série</dt><dd>{dados.card.set.series}</dd></div>}
                  <div><dt>Identificador</dt><dd className="dados">{dados.card.id}</dd></div>
                </dl>
                {dados.card.description && <p className={s.descricao}>{dados.card.description}</p>}
              </div>
              <div className={s.painel}>
                <h3>Em jogo</h3>
                {dados.card.abilities?.map((ability, index) => (
                  <article className={s.ataque} key={`ability-${index}`}><span className={s.eyebrow}>{ability.type || "Habilidade"}</span><h4>{ability.name || "Nome não traduzido"}</h4>{ability.effect && <p>{ability.effect}</p>}</article>
                ))}
                {dados.card.attacks?.map((ataque, index) => (
                  <article className={s.ataque} key={`attack-${index}`}>
                    <div className={s.ataqueTitulo}><h4>{ataque.name || "Nome não traduzido"}</h4><span className="dados">{ataque.damage}</span></div>
                    {ataque.cost?.length > 0 && <p className={s.suave}>Energia: {ataque.cost.join(" · ")}</p>}
                    {ataque.effect && <p>{ataque.effect}</p>}
                  </article>
                ))}
                {!dados.card.attacks?.length && !dados.card.abilities?.length && <p className={s.suave}>Esta carta não possui ataques ou habilidades listados.</p>}
              </div>
            </div>
          </section>
          <AnunciosDaCarta listings={dados.listings} />
        </>
      )}
    </div>
  );
}
