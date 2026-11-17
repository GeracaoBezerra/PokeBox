import s from "../../styles/vitrine.module.css";
import { CATEGORIAS, TIPOS } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import PainelFiltros, { GrupoFiltro } from "../PainelFiltros/PainelFiltros";

const comRotulos = (valores, rotulos = {}) => valores.map((valor) => [valor, rotulos[valor] ?? valor]);

export default function FiltrosCatalogo({ opcoes, filtros, onAlterar, onLimpar, onAplicar }) {
  const { dados, erro, carregando, recarregar } = opcoes;

  return (
    <PainelFiltros
      rotulo="Filtros do catálogo"
      tituloModal="Filtrar cartas"
      filtros={filtros}
      onAlterar={onAlterar}
      onLimpar={onLimpar}
      onAplicar={onAplicar}
    >
      {(valores, alterar) => (
        <>
          {carregando && (
            <p className={s.suave} role="status">
              Carregando filtros…
            </p>
          )}
          <Aviso erro={erro} onTentarDeNovo={recarregar} />
          {!carregando && dados && (
            <>
              <GrupoFiltro
                titulo="Categoria"
                valor={valores.category}
                opcoes={comRotulos(dados.categories, CATEGORIAS)}
                onAlterar={(valor) => alterar("category", valor)}
              />
              <GrupoFiltro
                titulo="Tipo"
                valor={valores.type}
                opcoes={comRotulos(dados.types, TIPOS)}
                onAlterar={(valor) => alterar("type", valor)}
              />
              <GrupoFiltro
                titulo="Raridade"
                valor={valores.rarity}
                opcoes={comRotulos(dados.rarities)}
                onAlterar={(valor) => alterar("rarity", valor)}
              />
              <label className={s.campo}>
                Expansão
                <select value={valores.set} onChange={(e) => alterar("set", e.target.value)}>
                  <option value="">Todas as expansões</option>
                  {dados.sets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className={s.ajuda}>Selecione uma opção por grupo. Os filtros são combinados na busca.</p>
            </>
          )}
        </>
      )}
    </PainelFiltros>
  );
}
