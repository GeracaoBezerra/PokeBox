import s from "../../styles/vitrine.module.css";
import { CATEGORIAS, TIPOS } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import PainelFiltros, { GrupoFiltro, GruposCarregando, SeletorExpansao } from "../PainelFiltros/PainelFiltros";

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
          {carregando && <GruposCarregando grupos={3} comLista />}
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
              <SeletorExpansao valor={valores.set} expansoes={dados.sets} onAlterar={(valor) => alterar("set", valor)} />
              <p className={s.ajuda}>Selecione uma opção por grupo. Os filtros são combinados na busca.</p>
            </>
          )}
        </>
      )}
    </PainelFiltros>
  );
}
