import { useState } from "react";
import {
  Search,
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
import { Link, useNavigate } from "react-router-dom";
import Logo from "../Logo/Logo";
import MenuUsuario from "../MenuUsuario/MenuUsuario";
import { usePendencias } from "../../hooks/usePendencias";
import styles from "./header.module.css";

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();
  const pendencias = usePendencias();

  function buscar(event) {
    event.preventDefault();
    navigate(`/catalogo?name=${encodeURIComponent(busca.trim())}`);
  }

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo, busca e ações */}
        <div className={styles.topo}>
          <Link
            to="/"
            className={styles.logo}
            aria-label="PokeBox, página inicial"
          >
            <Logo decorativa tamanho={44} />
          </Link>

          {/* Busca para desktop */}
          <form
            className={`${styles.buscaContainer} ${styles.buscaDesktop}`}
            role="search"
            onSubmit={buscar}
          >
            <Search className={styles.iconeBusca} size={18} />

            <input
              type="search"
              placeholder="Buscar cartas, sets ou colecionadores..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className={styles.inputBusca}
              aria-label="Buscar cartas, sets ou colecionadores"
            />
          </form>

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

        {/* Busca para dispositivos móveis */}
        <form
          className={`${styles.buscaContainer} ${styles.buscaMobile}`}
          role="search"
          onSubmit={buscar}
        >
          <Search className={styles.iconeBusca} size={18} />

          <input
            type="search"
            placeholder="Buscar cartas ou sets..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className={styles.inputBusca}
            aria-label="Buscar cartas ou sets"
          />
        </form>

        {/* Navegação */}
        <nav
          id="menu-navegacao"
          className={`${styles.navegacao} ${
            menuAberto ? styles.navegacaoAberta : ""
          }`}
          aria-label="Navegação principal"
        >
          <Link to="/" className={styles.linkNav} onClick={fecharMenu}>
            <Home size={16} />
            <span>Home</span>
          </Link>

          <Link to="/catalogo" className={styles.linkNav} onClick={fecharMenu}>
            <Layers size={16} />
            <span>Cards</span>
          </Link>

          <Link to="/marketplace" className={styles.linkNav} onClick={fecharMenu}>
            <Store size={16} />
            <span>Marketplace</span>
          </Link>

          <Link to="/colecao" className={styles.linkNav} onClick={fecharMenu}>
            <Library size={16} />
            <span>Coleção</span>
          </Link>

          <Link to="/procuro" className={styles.linkNav} onClick={fecharMenu}>
            <Heart size={16} />
            <span>Wishlist</span>
          </Link>

          <Link to="/anuncios" className={styles.linkNav} onClick={fecharMenu}>
            <Megaphone size={16} />
            <span>Anúncios</span>
          </Link>

          <Link
            to={pendencias.ofertas > 0 ? "/propostas?aba=recebidas&status=PROPOSED" : "/propostas"}
            className={styles.linkNav}
            onClick={fecharMenu}
            aria-label={pendencias.ofertas > 0 ? `Propostas, ${pendencias.ofertas} aguardando resposta` : undefined}
          >
            <Inbox size={16} />
            <span>Propostas</span>
            {pendencias.ofertas > 0 && <span className={styles.selo} aria-hidden="true">{pendencias.ofertas}</span>}
          </Link>

          <Link
            to={pendencias.trocas > 0 ? "/trocas?aba=recebidas&status=PROPOSED" : "/trocas"}
            className={styles.linkNav}
            onClick={fecharMenu}
            aria-label={pendencias.trocas > 0 ? `Trocas, ${pendencias.trocas} aguardando você concluir` : undefined}
          >
            <ArrowLeftRight size={16} />
            <span>Trocas</span>
            {pendencias.trocas > 0 && <span className={styles.selo} aria-hidden="true">{pendencias.trocas}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}