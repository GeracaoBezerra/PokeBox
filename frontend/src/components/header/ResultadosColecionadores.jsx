import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { searchCollectors } from "../../api/users";
import { mensagemAmigavel } from "../../api/mensagens";
import { useListaPaginada } from "../../hooks/useListaPaginada";
import Avatar from "../Avatar/Avatar";
import styles from "./header.module.css";

function mensagemDaBusca(erro) {
  if (erro.status === 400) return "Revise o texto da busca e tente um nome ou usuário.";
  if (erro.status === 404) return "A busca de colecionadores está indisponível no servidor.";
  return mensagemAmigavel(erro);
}

function ListaColecionadores({ termo, aoEscolher, campoRef }) {
  const ultimoLink = useRef(null);
  const { itens, temMais, carregando, carregandoMais, erro, carregarMais, tentarDeNovo } =
    useListaPaginada((pagina, signal) => searchCollectors(termo, pagina, 5, signal), termo);

  // Uma alteração entre páginas pode deslocar um perfil para a página seguinte.
  const perfis = useMemo(() => {
    const porUsername = new Map();
    for (const item of itens) porUsername.set(item.username, item);
    return Array.from(porUsername.values());
  }, [itens]);
  const termoInvalido = erro?.status === 400;

  function buscarPagina() {
    // Mantém o foco no painel quando o botão desaparece. Tab segue para o primeiro resultado novo.
    (ultimoLink.current ?? campoRef.current).focus();
    if (erro) tentarDeNovo();
    else carregarMais();
  }

  return (
    <>
      {perfis.length > 0 && (
        <ul aria-label="Colecionadores encontrados" className={styles.listaColecionadores}>
          {perfis.map(({ username, name }, indice) => (
            <li key={username}>
              <Link
                to={`/u/${encodeURIComponent(username)}`}
                onClick={aoEscolher}
                ref={indice === perfis.length - 1 ? ultimoLink : undefined}
                aria-label={`${name} @${username}`}
              >
                <Avatar nome={name} username={username} />
                <span><strong>{name}</strong><small>@{username}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {carregando && <p role="status">Buscando colecionadores…</p>}
      {!carregando && !erro && !perfis.length && <p role="status">Nenhum colecionador encontrado.</p>}
      {erro && <p role="alert">{mensagemDaBusca(erro)}</p>}
      {!termoInvalido && (erro || temMais || carregandoMais) && (
        <button type="button" disabled={carregandoMais} onClick={buscarPagina}>
          {erro ? "Tentar de novo" : carregandoMais ? "Carregando…" : "Carregar mais colecionadores"}
        </button>
      )}
    </>
  );
}

// O header remonta este painel ao mudar o termo, descartando a espera e a lista anteriores.
export default function ResultadosColecionadores({ id, termo, aoEscolher, campoRef }) {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    if (!termo) return;
    const timer = setTimeout(() => setPronto(true), 300);
    return () => clearTimeout(timer);
  }, [termo]);

  return (
    <div id={id} className={styles.resultadosColecionadores}>
      {pronto ? <ListaColecionadores termo={termo} aoEscolher={aoEscolher} campoRef={campoRef} /> : (
        <p role="status">{termo ? "Buscando colecionadores…" : "Digite um nome ou usuário depois do @."}</p>
      )}
    </div>
  );
}
