import s from "../../styles/vitrine.module.css";
import { usernameValido } from "../../utils/filtrosMarketplace";
import { ACABAMENTOS, CONDICOES, TIPOS } from "../../utils/rotulos";
import Aviso from "../Aviso/Aviso";
import CampoBusca from "../CampoBusca/CampoBusca";
import PainelFiltros, { GrupoFiltro, GruposCarregando } from "../PainelFiltros/PainelFiltros";

const EDICOES = [
  ["true", "Só 1ª edição"],
  ["false", "Sem 1ª edição"],
];

function semUsernameInvalido(filtros) {
  return usernameValido(filtros.username) ? filtros : { ...filtros, username: "" };
}

export default function FiltrosMarketplace({ filtros, raridades, logado, onAlterar, onLimpar, onAplicar }) {
  return (
    <PainelFiltros
      rotulo="Filtros do marketplace"
      tituloModal="Filtrar anúncios"
      filtros={filtros}
      onAlterar={onAlterar}
      onLimpar={onLimpar}
      onAplicar={(rascunho) => onAplicar(semUsernameInvalido(rascunho))}
    >
      {(valores, alterar, noModal) => (
        <>
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
            onAlterar={(valor) => alterar("finish", valor)}
          />
          <GrupoFiltro
            titulo="1ª edição"
            valor={valores.firstEdition}
            opcoes={EDICOES}
            onAlterar={(valor) => alterar("firstEdition", valor)}
          />
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
          <fieldset className={s.grupo}>
            <legend>Colecionador</legend>
            <CampoBusca
              rotulo="Nome de usuário"
              valor={valores.username}
              placeholder="ex.: ash"
              maxLength={20}
              imediato={noModal}
              onMudar={(texto) => {
                const username = texto.toLowerCase();
                if (noModal || username === "" || usernameValido(username)) alterar("username", username);
              }}
            />
          </fieldset>
          {logado && (
            <fieldset className={s.grupo}>
              <legend>Wishlist</legend>
              <div className={s.opcoes}>
                <label>
                  <input
                    type="checkbox"
                    checked={valores.wishlist === "1"}
                    onChange={(e) => alterar("wishlist", e.target.checked ? "1" : "")}
                  />
                  Só cartas da minha wishlist (nesta página)
                </label>
              </div>
            </fieldset>
          )}
        </>
      )}
    </PainelFiltros>
  );
}
