import { ExternalLink } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Abas from "../components/Abas/Abas";
import { idDaAba } from "../components/Abas/idDaAba";
import CabecalhoPagina from "../components/CabecalhoPagina/CabecalhoPagina";
import s from "../styles/paginas.module.css";
import m from "./sobre.module.css";
import { ENDERECOS, PASSOS_TROCA, RECURSOS, REPOSITORIO, SECOES_PROJETO } from "./sobreConteudo";

const PAINEL = "sobre-painel";

const ABAS = [
  { valor: "ferramenta", rotulo: "A ferramenta" },
  { valor: "projeto", rotulo: "Como foi feito" },
];

function abaDaUrl(valor) {
  return ABAS.some((aba) => aba.valor === valor) ? valor : "ferramenta";
}

function LinkExterno({ href, children, className = s.link }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function AFerramenta() {
  return (
    <>
      <section className={m.bloco} aria-labelledby="sobre-o-que-e">
        <h2 id="sobre-o-que-e">O que é</h2>
        <p>
          O PokeBox é uma plataforma de trocas de cartas de Pokémon TCG. Aqui não se vende nada: as cartas mudam de dono
          só por troca. O preço que aparece nas cartas vem da TCGdex e serve só de referência para comparar o que se dá e o
          que se recebe.
        </p>
        <p>
          É para quem coleciona e quer completar a coleção trocando as cartas repetidas com outras pessoas.
        </p>
      </section>

      <section className={m.bloco} aria-labelledby="sobre-como-troca">
        <h2 id="sobre-como-troca">Como funciona a troca</h2>
        <ol className={m.passos}>
          {PASSOS_TROCA.map((passo, i) => (
            <li key={passo}>
              <span className={m.numero} aria-hidden="true">{i + 1}</span>
              <span>{passo}</span>
            </li>
          ))}
        </ol>
        <p className={s.suave}>
          Enquanto a troca está aberta, quem aceitou pode recusar e quem ofertou pode cancelar. As cartas reservadas voltam
          para a coleção de cada um.
        </p>
      </section>

      <section aria-labelledby="sobre-recursos">
        <h2 id="sobre-recursos" className={m.tituloSecao}>O que dá para fazer</h2>
        <ul className={m.grade}>
          {RECURSOS.map((recurso) => (
            <li key={recurso.titulo} className={m.cartao}>
              <h3>
                <Link className={s.link} to={recurso.to}>{recurso.titulo}</Link>
              </h3>
              <p>{recurso.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={m.bloco} aria-labelledby="sobre-curso">
        <h2 id="sobre-curso">Projeto do curso</h2>
        <p>
          O PokeBox é o projeto final do curso Geração Tech, feito em equipe. O código é aberto e está no{" "}
          <LinkExterno href={REPOSITORIO}>repositório do GitHub</LinkExterno>. A aba{" "}
          <Link className={s.link} to="/sobre?aba=projeto">Como foi feito</Link> conta as decisões técnicas.
        </p>
      </section>
    </>
  );
}

function ComoFoiFeito() {
  return (
    <>
      <section className={m.bloco} aria-labelledby="sobre-resumo">
        <h2 id="sobre-resumo">Resumo da entrega</h2>
        <p>
          Esta aba resume a documentação do projeto final: como o PokeBox foi construído, testado e publicado, e por quê.
          Cada parte aponta para o documento completo no repositório. Números de 24/11/2026.
        </p>
        <ul className={m.enderecos}>
          {ENDERECOS.map((endereco) => (
            <li key={endereco.rotulo}>
              <LinkExterno href={endereco.href} className={m.endereco}>
                {endereco.rotulo} <ExternalLink size={14} aria-hidden="true" />
              </LinkExterno>
            </li>
          ))}
        </ul>
      </section>

      <nav className={m.indice} aria-label="Partes da documentação">
        <ul>
          {SECOES_PROJETO.map((secao) => (
            <li key={secao.id}>
              <a href={`#${secao.id}`}>{secao.titulo}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={m.secoes}>
        {SECOES_PROJETO.map((secao) => (
          <section key={secao.id} id={secao.id} className={m.cartao} aria-labelledby={`${secao.id}-titulo`}>
            <h2 id={`${secao.id}-titulo`}>{secao.titulo}</h2>
            {secao.texto?.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
            {secao.itens && (
              <ul className={m.itens}>
                {secao.itens.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            <LinkExterno href={secao.link.href} className={`${s.link} ${m.mais}`}>
              {secao.link.rotulo} <ExternalLink size={14} aria-hidden="true" />
            </LinkExterno>
          </section>
        ))}
      </div>
    </>
  );
}

export default function SobrePage() {
  const [params, setParams] = useSearchParams();
  const aba = abaDaUrl(params.get("aba"));

  function irPara(valor) {
    const novos = new URLSearchParams(params);
    novos.set("aba", valor);
    setParams(novos, { replace: true });
  }

  return (
    <div className={s.pagina}>
      <CabecalhoPagina titulo="Sobre o PokeBox">
        Uma plataforma de trocas de cartas de Pokémon TCG, feita como projeto final do curso Geração Tech.
      </CabecalhoPagina>

      <Abas rotulo="Partes da página" abas={ABAS} selecionada={aba} onSelecionar={irPara} idPainel={PAINEL} />

      <div id={PAINEL} role="tabpanel" aria-labelledby={idDaAba(PAINEL, aba)} className={m.painel}>
        {aba === "ferramenta" ? <AFerramenta /> : <ComoFoiFeito />}
      </div>
    </div>
  );
}
