import s from "../../styles/vitrine.module.css";
import { LIMITE_BUSCA } from "../../utils/busca";
import { VISIBILIDADES } from "../../utils/colecao";
import { ACABAMENTOS, CONDICOES, TIPOS } from "../../utils/rotulos";
import CampoBusca from "../CampoBusca/CampoBusca";
import PainelFiltros, { GrupoFiltro } from "../PainelFiltros/PainelFiltros";

export default function FiltrosColecao({ filtros, onAlterar, onLimpar, onAplicar }) {
  return (
    <PainelFiltros
      rotulo="Filtros da coleção"
      tituloModal="Filtrar coleção"
      filtros={filtros}
      onAlterar={onAlterar}
      onLimpar={onLimpar}
      onAplicar={onAplicar}
    >
      {(valores, alterar, noModal) => (
        <>
          <fieldset className={s.grupo}>
            <legend>Nome</legend>
            <CampoBusca
              rotulo="Nome da carta"
              valor={valores.q}
              placeholder="ex.: pikachu"
              maxLength={LIMITE_BUSCA}
              imediato={noModal}
              onMudar={(texto) => alterar("q", texto)}
            />
          </fieldset>
          <GrupoFiltro titulo="Tipo" valor={valores.type} opcoes={Object.entries(TIPOS)} onAlterar={(valor) => alterar("type", valor)} />
          <GrupoFiltro
            titulo="Condição"
            valor={valores.condition}
            opcoes={Object.entries(CONDICOES)}
            onAlterar={(valor) => alterar("condition", valor)}
          />
          <GrupoFiltro
            titulo="Acabamento"
            valor={valores.finish}
            opcoes={Object.entries(ACABAMENTOS)}
            todas="Todos"
            onAlterar={(valor) => alterar("finish", valor)}
          />
          <GrupoFiltro
            titulo="Visibilidade"
            valor={valores.isPublic}
            opcoes={Object.entries(VISIBILIDADES)}
            todas="Públicas e privadas"
            onAlterar={(valor) => alterar("isPublic", valor)}
          />
          <fieldset className={s.grupo}>
            <legend>Quantidade</legend>
            <div className={s.opcoes}>
              <label>
                <input
                  type="checkbox"
                  checked={valores.zerados === "1"}
                  onChange={(evento) => alterar("zerados", evento.target.checked ? "1" : "")}
                />
                Mostrar zerados
              </label>
            </div>
          </fieldset>
        </>
      )}
    </PainelFiltros>
  );
}
