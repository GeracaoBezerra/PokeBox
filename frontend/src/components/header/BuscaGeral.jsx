import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ErroCampo from "../ErroCampo/ErroCampo";
import { contextoDaBusca, destinoDaBusca, ehBuscaDePerfil, termoDaUrl } from "../../utils/buscaGeral";
import styles from "./header.module.css";

export default function BuscaGeral() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const erroId = useId();
  const contexto = contextoDaBusca(pathname);
  const valor = termoDaUrl(pathname, search);
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);
  const [erro, setErro] = useState("");
  const localRef = useRef({ pathname, search });

  useEffect(() => {
    localRef.current = { pathname, search };
  });

  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    if (valor !== texto.trim()) setTexto(valor);
    setErro("");
  }

  useEffect(() => {
    if (!contexto.naPaginaDeResultados || ehBuscaDePerfil(texto) || texto.trim() === valor) return undefined;
    const espera = setTimeout(() => {
      const atual = localRef.current;
      navigate(destinoDaBusca(atual.pathname, atual.search, texto).url);
    }, 400);
    return () => clearTimeout(espera);
  }, [texto, valor, contexto.naPaginaDeResultados, navigate]);

  function enviar(evento) {
    evento.preventDefault();
    const destino = destinoDaBusca(pathname, search, texto);
    if (destino.erro) {
      setErro(destino.erro);
      return;
    }
    navigate(destino.url);
  }

  function digitar(evento) {
    setTexto(evento.target.value);
    setErro("");
  }

  return (
    <form className={styles.buscaContainer} role="search" aria-label={contexto.rotulo} onSubmit={enviar}>
      <span className={styles.buscaCampo}>
        <Search className={styles.iconeBusca} size={18} aria-hidden="true" />
        <input
          type="search"
          maxLength={50}
          placeholder={contexto.placeholder}
          value={texto}
          onChange={digitar}
          className={styles.inputBusca}
          aria-label={contexto.rotulo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? erroId : undefined}
        />
      </span>
      {erro && (
        <div className={styles.buscaErro}>
          <ErroCampo id={erroId} mensagem={erro} />
        </div>
      )}
    </form>
  );
}
