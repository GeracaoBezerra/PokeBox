import { getCard } from "../../api/cards";
import { useCarregar } from "../../hooks/useCarregar";
import { buscarComReserva } from "../../utils/idioma";
import Aviso from "../Aviso/Aviso";
import FormColecao from "../FormColecao/FormColecao";
import d from "../../styles/detalheCarta.module.css";
import s from "./AdicionarNaColecao.module.css";

export default function AdicionarNaColecao({ carta, lang, onAdicionado, mensagem }) {
  const detalhe = useCarregar(
    () => buscarComReserva((idioma) => getCard(carta.id, idioma), lang),
    `${carta.id}|${lang ?? ""}`
  );
  if (detalhe.carregando) return (
    <div className={s.carregando} role="status" aria-label="Carregando detalhes da carta" aria-busy="true">
      <span className={s.srOnly}>Carregando detalhes da carta…</span>
      <div className={d.formulario} aria-hidden="true">
        <p className={d.suave}>Escolha a versão e o estado da carta que você tem.</p>
        <div className={d.campos}>
          {["Acabamento", "Condição"].map((label) => (
            <div className={d.campo} key={label}>
              <span className={`${s.textoEsqueleto} ${s.rotulo}`}>{label}</span>
              <span className={`${s.brilho} ${s.controle}`} />
            </div>
          ))}
          <div>
            <div className={d.campo}>
              <span className={`${s.textoEsqueleto} ${s.rotulo} ${s.rotuloCurto}`}>Quantidade</span>
              <span className={`${s.brilho} ${s.controle}`} />
            </div>
          </div>
          {[["edicao", "1ª edição (indisponível)"], ["publico", "Visível no meu perfil público"]].map(([key, label]) => (
            <div className={d.checkbox} key={key}>
              <span className={`${s.brilho} ${s.marcador}`} />
              <span className={`${s.textoEsqueleto} ${s.rotuloCheckbox}`}>{label}</span>
            </div>
          ))}
        </div>
        <button className={`${d.botao} ${s.botao}`} type="button" tabIndex={-1}><span className={s.textoBotao}>Adicionar à coleção</span></button>
      </div>
    </div>
  );
  if (detalhe.erro) return <Aviso erro={detalhe.erro} onTentarDeNovo={detalhe.recarregar} />;
  const { dados, lang: idioma } = detalhe.dados;
  return <FormColecao key={carta.id} card={dados.card} lang={idioma} onAdicionado={onAdicionado} mensagem={mensagem} />;
}
