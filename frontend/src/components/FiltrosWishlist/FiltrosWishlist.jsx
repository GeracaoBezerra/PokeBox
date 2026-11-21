import s from "../../styles/vitrine.module.css";
import { LIMITE_BUSCA } from "../../utils/perfilPublico";
import { TIPOS } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import CampoBusca from "../CampoBusca/CampoBusca";
import PainelFiltros, { GrupoFiltro, GruposCarregando } from "../PainelFiltros/PainelFiltros";

export default function FiltrosWishlist({ filtros, raridades, onAlterar, onLimpar, onAplicar }) {
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
          <GrupoFiltro
            titulo="Tipo"
            valor={valores.type}
            opcoes={Object.entries(TIPOS)}
            onAlterar={(valor) => alterar("type", valor)}
          />
          {raridades.carregando && <GruposCarregando rotulo="Carregando raridades" />}
          <Aviso erro={raridades.erro} onTentarDeNovo={raridades.recarregar} />
          {raridades.dados?.length > 0 && (
            <GrupoFiltro
              titulo="Raridade"
              valor={valores.rarity}
              opcoes={raridades.dados.map((raridade) => [raridade, raridade])}
              onAlterar={(valor) => alterar("rarity", valor)}
            />
          )}
        </>
      )}
    </PainelFiltros>
  );
}
