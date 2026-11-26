import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ResultadosColecionadores from "./ResultadosColecionadores";
import { contextoDaBusca, destinoDaBusca, ehBuscaDePerfil, termoDaUrl } from "../../utils/buscaGeral";
import styles from "./header.module.css";

export default function BuscaGeral() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const resultadosId = useId();
  const contexto = contextoDaBusca(pathname);
  const valor = termoDaUrl(pathname, search);
  const [texto, setTexto] = useState(valor);
  const [anterior, setAnterior] = useState({ valor, pathname });
  const [aberto, setAberto] = useState(false);
  const perfil = ehBuscaDePerfil(texto);
  const rotulo = perfil ? "Buscar colecionadores" : contexto.rotulo;
  const termoPerfil = texto.trim().slice(1).trim();
  const localRef = useRef({ pathname, search });

  useEffect(() => {
    localRef.current = { pathname, search };
  });

  if (valor !== anterior.valor || pathname !== anterior.pathname) {
    const trocouDePagina = pathname !== anterior.pathname;
    setAnterior({ valor, pathname });
    if (trocouDePagina || valor !== texto.trim()) setTexto(valor);
    setAberto(false);
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
    if (perfil) {
      setAberto(true);
      return;
    }
    navigate(destinoDaBusca(pathname, search, texto).url);
  }

  function digitar(evento) {
    const valorDigitado = evento.target.value;
    setTexto(ehBuscaDePerfil(valorDigitado) ? valorDigitado : valorDigitado.slice(0, 50));
    setAberto(true);
  }

  return (
    <form
      className={styles.buscaContainer}
      role="search"
      aria-label={rotulo}
      onSubmit={enviar}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) setAberto(false);
      }}
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && aberto && perfil) {
          evento.preventDefault();
          inputRef.current.focus();
          setAberto(false);
        }
      }}
    >
      <span className={styles.buscaCampo}>
        <Search className={styles.iconeBusca} size={18} aria-hidden="true" />
        <input
          type="search"
          ref={inputRef}
          maxLength={51}
          placeholder={contexto.placeholder}
          value={texto}
          onChange={digitar}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          className={styles.inputBusca}
          aria-label={rotulo}
          aria-controls={perfil && aberto ? resultadosId : undefined}
        />
      </span>
      {perfil && aberto && (
        <ResultadosColecionadores
          key={termoPerfil}
          id={resultadosId}
          termo={termoPerfil}
          campoRef={inputRef}
          aoEscolher={() => setAberto(false)}
        />
      )}
    </form>
  );
}
