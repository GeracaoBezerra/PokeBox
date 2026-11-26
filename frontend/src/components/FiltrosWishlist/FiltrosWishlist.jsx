import s from "../../styles/vitrine.module.css";
import { LIMITE_BUSCA } from "../../utils/busca";
import { TIPOS } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import CampoBusca from "../CampoBusca/CampoBusca";
import PainelFiltros, { GrupoFiltro, GruposCarregando, SeletorExpansao } from "../PainelFiltros/PainelFiltros";

export default function FiltrosWishlist({ filtros, filtrosDisponiveis, carregando, erro, onTentarDeNovo, onAlterar, onLimpar, onAplicar }) {
  const { types = [], rarities = [], sets = [] } = filtrosDisponiveis ?? {};
  return (
    <PainelFiltros
      rotulo="Filtros da wishlist"
      tituloModal="Filtrar wishlist"
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
              placeholder="ex.: charizard"
              maxLength={LIMITE_BUSCA}
              imediato={noModal}
              onMudar={(texto) => alterar("q", texto)}
            />
          </fieldset>
          {carregando && <GruposCarregando grupos={2} comLista />}
          <Aviso erro={erro} onTentarDeNovo={onTentarDeNovo} />
          {filtrosDisponiveis && (types.length > 0 || valores.type) && (
            <GrupoFiltro
              titulo="Tipo"
              valor={valores.type}
              rotuloAtual={TIPOS[valores.type]}
              opcoes={types.map((tipo) => [tipo, TIPOS[tipo]])}
              onAlterar={(valor) => alterar("type", valor)}
            />
          )}
          {filtrosDisponiveis && (rarities.length > 0 || valores.rarity) && (
            <GrupoFiltro
              titulo="Raridade"
              valor={valores.rarity}
              opcoes={rarities.map((raridade) => [raridade, raridade])}
              onAlterar={(valor) => alterar("rarity", valor)}
            />
          )}
          {filtrosDisponiveis && (sets.length > 0 || valores.setId) && (
            <SeletorExpansao valor={valores.setId} expansoes={sets} onAlterar={(valor) => alterar("setId", valor)} />
          )}
        </>
      )}
    </PainelFiltros>
  );
}
