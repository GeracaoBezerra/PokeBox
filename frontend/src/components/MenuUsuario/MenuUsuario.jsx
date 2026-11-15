import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, UserRound } from "lucide-react";
import { useAuthService } from "../../auth/useAuthService";
import { useSession } from "../../auth/useSession";
import styles from "./MenuUsuario.module.css";

export default function MenuUsuario() {
  const auth = useAuthService();
  const session = useSession();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);
  const botaoRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;

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
        <User size={20} aria-hidden="true" />
        <span className={styles.textoEntrar}>Entrar</span>
      </Link>
    );
  }

  function sair() {
    setAberto(false);
    auth.logout();
    navigate("/");
  }

  const user = session.user;

  return (
    <div className={styles.usuario} ref={containerRef}>
      <button
        ref={botaoRef}
        type="button"
        className={styles.botao}
        aria-label="Menu do usuário"
        aria-expanded={aberto}
        aria-controls="menu-usuario"
        onClick={() => setAberto(!aberto)}
      >
        <User size={20} aria-hidden="true" />
      </button>

      {aberto && (
        <div id="menu-usuario" className={styles.painel}>
          {user && (
            <div className={styles.identificacao}>
              <p className={styles.nome}>{user.name}</p>
              <p className={styles.username}>@{user.username}</p>
            </div>
          )}

          <ul className={styles.lista} role="list">
            <li className={styles.item}>
              <Link
                to="/perfil"
                className={styles.opcao}
                onClick={() => setAberto(false)}
              >
                <UserRound size={16} aria-hidden="true" />
                Meu perfil
              </Link>
            </li>
            <li className={styles.item}>
              <button type="button" className={styles.opcao} onClick={sair}>
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
