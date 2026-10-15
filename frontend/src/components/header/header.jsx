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
          <a href="/" className={styles.logo}>
            <span className={styles.monograma}>PB</span>
            <span className={styles.logoTexto}>PokeBox</span>
          </a>

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
            <a
              href="/perfil"
              className={styles.botaoPerfil}
              aria-label="Perfil do usuário"
            >
              <User size={20} />
            </a>

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
          <a href="/" className={styles.linkNav} onClick={fecharMenu}>
            <Home size={16} />
            <span>Home</span>
          </a>

          <a href="/catalogo" className={styles.linkNav} onClick={fecharMenu}>
            <Layers size={16} />
            <span>Cards</span>
          </a>

          <a href="/procuro" className={styles.linkNav} onClick={fecharMenu}>
            <Heart size={16} />
            <span>Wishlist</span>
          </a>

          <a href="/propostas" className={styles.linkNav} onClick={fecharMenu}>
            <ArrowLeftRight size={16} />
            <span>Minhas Trocas</span>
          </a>
        </nav>
      </div>
    </header>
  );
}