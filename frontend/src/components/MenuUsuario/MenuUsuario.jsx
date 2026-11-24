import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, Heart, Library, LogOut, User, UserRound } from "lucide-react";
import { useAuthService } from "../../auth/useAuthService";
import { useSession } from "../../auth/useSession";
import Avatar from "../Avatar/Avatar";
import styles from "./MenuUsuario.module.css";

function itensDoMenu(menu) {
  return Array.from(menu?.querySelectorAll('[role="menuitem"]') ?? []);
}

export default function MenuUsuario() {
  const auth = useAuthService();
  const session = useSession();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);
  const botaoRef = useRef(null);
  const menuRef = useRef(null);
  const focoAoAbrir = useRef("primeiro");

  useEffect(() => {
    if (!aberto) return undefined;

    const itens = itensDoMenu(menuRef.current);
    const alvo = focoAoAbrir.current === "ultimo" ? itens.at(-1) : itens[0];
    alvo?.focus();

    function fecharAoClicarFora(event) {
      if (!containerRef.current?.contains(event.target)) setAberto(false);
    }

    function fecharComEsc(event) {
      if (event.key !== "Escape") return;
      setAberto(false);
      botaoRef.current?.focus();
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEsc);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, [aberto]);

  if (!session) {
    return (
      <Link to="/login" className={`${styles.botao} ${styles.botaoEntrar}`}>
        <span className={styles.textoEntrar}>Entrar</span>
        <User size={20} aria-hidden="true" />
      </Link>
    );
  }

  function abrir(foco) {
    focoAoAbrir.current = foco;
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
  }

  function sair() {
    setAberto(false);
    auth.logout({ voluntaria: true });
    navigate("/");
  }

  function teclaNoBotao(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      abrir("primeiro");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      abrir("ultimo");
    }
  }

  function teclaNoMenu(event) {
    const itens = itensDoMenu(menuRef.current);
    const atual = itens.indexOf(document.activeElement);
    const destinos = {
      ArrowDown: (atual + 1) % itens.length,
      ArrowUp: (atual - 1 + itens.length) % itens.length,
      Home: 0,
      End: itens.length - 1,
    };

    if (event.key in destinos) {
      event.preventDefault();
      itens[destinos[event.key]]?.focus();
    } else if (event.key === "Tab") {
      botaoRef.current?.focus();
      setAberto(false);
    }
  }

  const user = session.user;
  const nome = (user?.name ?? "").trim() || user?.username || "";
  const primeiroNome = nome.split(/\s+/)[0];

  return (
    <div className={styles.usuario} ref={containerRef}>
      <button
        ref={botaoRef}
        id="botao-menu-usuario"
        type="button"
        className={`${styles.botao} ${styles.botaoConta}`}
        aria-label={nome ? `Menu da conta de ${nome}` : "Menu da conta"}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? "menu-usuario" : undefined}
        onClick={() => (aberto ? fechar() : abrir("primeiro"))}
        onKeyDown={teclaNoBotao}
      >
        <Avatar nome={user?.name} username={user?.username} />
        {primeiroNome && <span className={styles.primeiroNome}>{primeiroNome}</span>}
      </button>

      {aberto && (
        <div className={styles.painel}>
          <div className={styles.identificacao}>
            <p className={styles.nome}>{nome}</p>
            <p className={styles.username}>@{user?.username}</p>
          </div>

          <ul
            id="menu-usuario"
            ref={menuRef}
            className={styles.lista}
            role="menu"
            aria-labelledby="botao-menu-usuario"
            onKeyDown={teclaNoMenu}
          >
            <li className={styles.item} role="none">
              <Link to="/perfil" role="menuitem" tabIndex={-1} className={styles.opcao} onClick={fechar}>
                <UserRound size={16} aria-hidden="true" />
                Meu perfil
              </Link>
            </li>
            <li className={styles.item} role="none">
              <Link
                to={`/u/${user?.username}`}
                role="menuitem"
                tabIndex={-1}
                className={styles.opcao}
                onClick={fechar}
              >
                <Globe size={16} aria-hidden="true" />
                Meu perfil público
              </Link>
            </li>
            <li className={styles.item} role="none">
              <Link to="/colecao" role="menuitem" tabIndex={-1} className={styles.opcao} onClick={fechar}>
                <Library size={16} aria-hidden="true" />
                Minha coleção
              </Link>
            </li>
            <li className={styles.item} role="none">
              <Link to="/procuro" role="menuitem" tabIndex={-1} className={styles.opcao} onClick={fechar}>
                <Heart size={16} aria-hidden="true" />
                Wishlist
              </Link>
            </li>
            <li className={`${styles.item} ${styles.itemSair}`} role="none">
              <button type="button" role="menuitem" tabIndex={-1} className={styles.opcao} onClick={sair}>
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
