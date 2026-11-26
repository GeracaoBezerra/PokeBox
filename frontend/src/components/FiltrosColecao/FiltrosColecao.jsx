import s from "../../styles/vitrine.module.css";
import { LIMITE_BUSCA } from "../../utils/busca";
import { VISIBILIDADES } from "../../utils/colecao";
import { ACABAMENTOS, CONDICOES, TIPOS } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import CampoBusca from "../CampoBusca/CampoBusca";
import PainelFiltros, { GrupoFiltro, GruposCarregando, SeletorExpansao } from "../PainelFiltros/PainelFiltros";

export default function FiltrosColecao({ filtros, filtrosDisponiveis, carregando, erro, onTentarDeNovo, onAlterar, onLimpar, onAplicar }) {
  const { types = [], sets = [], conditions = [], finishes = [] } = filtrosDisponiveis ?? {};
  const grupos = [
    { campo: "type", titulo: "Tipo", opcoes: types, rotulos: TIPOS },
    { campo: "condition", titulo: "Condição", opcoes: conditions, rotulos: CONDICOES },
    { campo: "finish", titulo: "Acabamento", opcoes: finishes, rotulos: ACABAMENTOS, todas: "Todos" },
  ];
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
          {carregando && <GruposCarregando grupos={grupos.length} comLista />}
          <Aviso erro={erro} onTentarDeNovo={onTentarDeNovo} />
          {filtrosDisponiveis && grupos.filter(({ campo, opcoes }) => opcoes.length || valores[campo]).map(({ campo, titulo, opcoes, rotulos, todas }) => (
            <GrupoFiltro
              key={campo}
              titulo={titulo}
              valor={valores[campo]}
              opcoes={opcoes.map((valor) => [valor, rotulos[valor]])}
              rotuloAtual={rotulos[valores[campo]]}
              todas={todas}
              onAlterar={(valor) => alterar(campo, valor)}
            />
          ))}
          {filtrosDisponiveis && (sets.length > 0 || valores.setId) && (
            <SeletorExpansao valor={valores.setId} expansoes={sets} onAlterar={(valor) => alterar("setId", valor)} />
          )}
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
