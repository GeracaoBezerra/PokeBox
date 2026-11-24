import { useState } from "react";
import {
  Menu,
  X,
  Heart,
  Layers,
  ArrowLeftRight,
  Home,
  Store,
  Library,
  Megaphone,
  Inbox,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import Logo from "../Logo/Logo";
import MenuUsuario from "../MenuUsuario/MenuUsuario";
import BuscaGeral from "./BuscaGeral";
import { useSession } from "../../auth/useSession";
import { usePendencias } from "../../hooks/usePendencias";
import styles from "./header.module.css";

function classeDoLink({ isActive }) {
  return isActive ? `${styles.linkNav} ${styles.ativo}` : styles.linkNav;
}

function GrupoNav({ id, titulo, children }) {
  return (
    <div className={styles.grupo} role="group" aria-labelledby={id}>
      <span id={id} className={styles.tituloGrupo}>{titulo}</span>
      {children}
    </div>
  );
}

function MinhaArea({ aoNavegar }) {
  const pendencias = usePendencias();

  return (
    <GrupoNav id="grupo-minha-area" titulo="Minha área">
      <NavLink to="/colecao" className={classeDoLink} onClick={aoNavegar}>
        <Library size={16} aria-hidden="true" />
        <span>Coleção</span>
      </NavLink>

      <NavLink to="/procuro" className={classeDoLink} onClick={aoNavegar}>
        <Heart size={16} aria-hidden="true" />
        <span>Wishlist</span>
      </NavLink>

      <NavLink to="/anuncios" className={classeDoLink} onClick={aoNavegar}>
        <Megaphone size={16} aria-hidden="true" />
        <span>Anúncios</span>
      </NavLink>

      <NavLink
        to={pendencias.ofertas > 0 ? "/propostas?aba=recebidas&status=PROPOSED" : "/propostas"}
        className={classeDoLink}
        onClick={aoNavegar}
        aria-label={pendencias.ofertas > 0 ? `Propostas, ${pendencias.ofertas} aguardando resposta` : undefined}
      >
        <Inbox size={16} aria-hidden="true" />
        <span>Propostas</span>
        {pendencias.ofertas > 0 && <span className={styles.selo} aria-hidden="true">{pendencias.ofertas}</span>}
      </NavLink>

      <NavLink
        to={pendencias.trocas > 0 ? `/trocas?aba=${pendencias.abaTrocas}&status=PROPOSED` : "/trocas"}
        className={classeDoLink}
        onClick={aoNavegar}
        aria-label={pendencias.trocas > 0 ? `Trocas, ${pendencias.trocas} esperando sua confirmação` : undefined}
      >
        <ArrowLeftRight size={16} aria-hidden="true" />
        <span>Trocas</span>
        {pendencias.trocas > 0 && <span className={styles.selo} aria-hidden="true">{pendencias.trocas}</span>}
      </NavLink>
    </GrupoNav>
  );
}

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const session = useSession();

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topo}>
          <Link
            to="/"
            className={styles.logo}
            aria-label="PokeBox, página inicial"
          >
            <Logo decorativa tamanho={44} />
          </Link>

          <BuscaGeral />

          <div className={styles.acoes}>
            <MenuUsuario />

            <button
              type="button"
              className={styles.botaoMenu}
              onClick={() => setMenuAberto(!menuAberto)}
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              aria-controls="menu-navegacao"
            >
              {menuAberto ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <nav
          id="menu-navegacao"
          className={`${styles.navegacao} ${
            menuAberto ? styles.navegacaoAberta : ""
          }`}
          aria-label="Navegação principal"
        >
          <GrupoNav id="grupo-explorar" titulo="Explorar">
            <NavLink to="/" end className={classeDoLink} onClick={fecharMenu}>
              <Home size={16} aria-hidden="true" />
              <span>Home</span>
            </NavLink>

            <NavLink to="/catalogo" className={classeDoLink} onClick={fecharMenu}>
              <Layers size={16} aria-hidden="true" />
              <span>Cartas</span>
            </NavLink>

            <NavLink to="/marketplace" className={classeDoLink} onClick={fecharMenu}>
              <Store size={16} aria-hidden="true" />
              <span>Marketplace</span>
            </NavLink>
          </GrupoNav>

          {session && <MinhaArea aoNavegar={fecharMenu} />}
        </nav>
      </div>
    </header>
  );
}
