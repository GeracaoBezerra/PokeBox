import { usernameValido } from "./filtrosMarketplace";

const CONTEXTOS = {
  catalogo: {
    caminho: "/catalogo",
    campo: "name",
    rotulo: "Buscar cartas",
    placeholder: "Buscar cartas… (ou @usuario)",
  },
  marketplace: {
    caminho: "/marketplace",
    campo: "q",
    rotulo: "Buscar no marketplace",
    placeholder: "Buscar no marketplace… (ou @usuario)",
  },
};

export function contextoDaBusca(pathname) {
  const marketplace = pathname === "/marketplace" || pathname.startsWith("/marketplace/");
  const contexto = CONTEXTOS[marketplace ? "marketplace" : "catalogo"];
  return { ...contexto, naPaginaDeResultados: pathname === contexto.caminho };
}

export function termoDaUrl(pathname, search) {
  const contexto = contextoDaBusca(pathname);
  if (!contexto.naPaginaDeResultados) return "";
  return new URLSearchParams(search).get(contexto.campo) ?? "";
}

export function ehBuscaDePerfil(texto) {
  return texto.trim().startsWith("@");
}

export function destinoDaBusca(pathname, search, texto) {
  const termo = texto.trim();
  if (ehBuscaDePerfil(termo)) {
    const username = termo.slice(1).trim().toLowerCase();
    if (!usernameValido(username)) return { erro: "Nome de usuário inválido" };
    return { url: `/u/${username}` };
  }
  const contexto = contextoDaBusca(pathname);
  const params = new URLSearchParams(contexto.naPaginaDeResultados ? search : "");
  if (termo) params.set(contexto.campo, termo);
  else params.delete(contexto.campo);
  params.delete("page");
  const query = params.toString();
  return { url: query ? `${contexto.caminho}?${query}` : contexto.caminho };
}
