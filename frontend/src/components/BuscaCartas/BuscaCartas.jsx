import { useEffect, useRef, useState } from "react";
import { searchCards } from "../../api/cards";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import { IDIOMAS, IDIOMA_PADRAO } from "../../utils/idioma";
import v from "../../styles/vitrine.module.css";
import Aviso from "../Aviso/Aviso";
import BarraBusca from "../BarraBusca/BarraBusca";
import ImagemCarta from "../ImagemCarta/ImagemCarta";
import s from "./BuscaCartas.module.css";

export default function BuscaCartas({ botao, erro, ocupado = false, inputRef, onEscolher }) {
  const [termo, setTermo] = useState("");
  const [lang, setLang] = useState(IDIOMA_PADRAO);
  const [tentou, setTentou] = useState(false);
  const expansivel = useRef(null);
  const conteudo = useRef(null);
  const buscar = termo.length >= 2;
  const lista = useListaPaginada(
    (page) => (buscar ? searchCards({ name: termo, lang, page, limit: 15 }) : Promise.resolve(null)),
    JSON.stringify({ termo, lang }),
  );

  useEffect(() => {
    if (typeof ResizeObserver !== "function") return undefined;
    const area = expansivel.current;
    const corpo = conteudo.current;
    const medir = () => area.style.setProperty("--altura-resultados", `${corpo.offsetHeight}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(corpo);
    return () => observador.disconnect();
  }, []);

  function rolar({ currentTarget }) {
    const falta = currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop;
    if (lista.temMais && falta <= 32) lista.carregarMais();
  }

  return (
    <>
      <div className={s.campos}>
        <BarraBusca rotulo="Buscar cartas" placeholder="Nome da carta…" valor={termo} onBuscar={setTermo} inputRef={inputRef} />
        <label className={v.campo}>
          Idioma das cartas
          <select value={lang} onChange={(evento) => setLang(evento.target.value)}>
            {Object.entries(IDIOMAS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
          </select>
        </label>
      </div>

      <div className={s.expansivel} ref={expansivel}>
        <div ref={conteudo}>
          {tentou && <Aviso erro={erro} />}
          <Aviso erro={lista.erro} onTentarDeNovo={lista.recarregar} />

          {(!buscar || lista.carregando || (!lista.erro && lista.itens.length === 0)) && (
            <p className={s.estado} role="status">
              {!buscar ? "Digite pelo menos 2 caracteres para buscar." : lista.carregando ? "Buscando cartas…" : "Nenhuma carta encontrada."}
            </p>
          )}

          {buscar && lista.itens.length > 0 && (
            <div className={s.rolagem} role="region" aria-label="Resultados da busca" tabIndex={0} onScroll={rolar}>
              <ul className={s.resultados} role="list">
                {lista.itens.map((carta) => {
                  const acao = botao(carta);
                  const expansao = [carta.set?.name, carta.number].filter(Boolean).join(" · ");
                  return (
                    <li className={s.resultado} key={carta.id}>
                      <div className={s.visual} aria-hidden="true">
                        <ImagemCarta className={s.miniatura} src={carta.image?.large ?? carta.image?.small} alt="" />
                      </div>
                      <div className={s.dados}>
                        <strong title={carta.name}>{carta.name}</strong>
                        {expansao && <p title={expansao}>{expansao}</p>}
                      </div>
                      <button
                        type="button"
                        className={s.acao}
                        disabled={acao.desativado || ocupado}
                        aria-label={acao.rotulo}
                        onClick={() => {
                          setTentou(true);
                          onEscolher(carta, lang);
                        }}
                      >
                        {acao.texto}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {(lista.temMais || lista.carregandoMais) && (
                <button type="button" className={s.mais} onClick={lista.carregarMais} disabled={lista.carregandoMais}>
                  {lista.carregandoMais ? "Carregando…" : "Ver mais cartas"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
