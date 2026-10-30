import { useState } from "react";
import {
  Search,
  User,
  Menu,
  X,
  Heart,
  Layers,
  ArrowLeftRight,
  Home,
} from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./header.module.css";

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState("");

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo, busca e ações */}
        <div className={styles.topo}>
          <Link to="/" className={styles.logo}>
            <span className={styles.monograma}>PB</span>
            <span className={styles.logoTexto}>PokeBox</span>
          </Link>

          {/* Busca para desktop */}
          <form
            className={`${styles.buscaContainer} ${styles.buscaDesktop}`}
            role="search"
            onSubmit={(event) => event.preventDefault()}
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
            <Link
              to="/perfil"
              className={styles.botaoPerfil}
              aria-label="Perfil do usuário"
            >
              <User size={20} />
            </Link>

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
          onSubmit={(event) => event.preventDefault()}
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

          <Link to="/procuro" className={styles.linkNav} onClick={fecharMenu}>
            <Heart size={16} />
            <span>Wishlist</span>
          </Link>

          <Link to="/propostas" className={styles.linkNav} onClick={fecharMenu}>
            <ArrowLeftRight size={16} />
            <span>Minhas Trocas</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}