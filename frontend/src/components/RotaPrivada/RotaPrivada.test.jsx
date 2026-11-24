import { act, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../auth/authProvider";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import RotaPrivada from "./RotaPrivada";

function PaginaLogin() {
  const location = useLocation();
  return <p>Login (veio de {location.state?.de})</p>;
}

function PaginaHome() {
  const location = useLocation();
  return <p>Home{location.state?.de ? ` (veio de ${location.state.de})` : ""}</p>;
}

function montar(service, endereco = "/colecao") {
  render(
    <MemoryRouter initialEntries={[endereco]}>
      <AuthProvider service={service}>
        <Routes>
          <Route path="/" element={<PaginaHome />} />
          <Route path="/login" element={<PaginaLogin />} />
          <Route element={<RotaPrivada />}>
            <Route path="/colecao" element={<p>Minha coleção</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("RotaPrivada", () => {
  it("sem sessão manda para o login guardando a página de origem", () => {
    montar(criarSessaoFalsa(null));

    expect(screen.getByText("Login (veio de /colecao)")).toBeInTheDocument();
    expect(screen.queryByText("Minha coleção")).not.toBeInTheDocument();
  });

  it("guarda também os filtros da URL de origem", () => {
    montar(criarSessaoFalsa(null), "/colecao?q=pikachu&page=2");

    expect(screen.getByText("Login (veio de /colecao?q=pikachu&page=2)")).toBeInTheDocument();
  });

  it("com sessão mostra a página", () => {
    montar(criarSessaoFalsa());

    expect(screen.getByText("Minha coleção")).toBeInTheDocument();
  });

  it("se a sessão cai sozinha com a página aberta, vai para o login", () => {
    const service = criarSessaoFalsa();
    montar(service);

    act(() => service.logout());

    expect(screen.getByText("Login (veio de /colecao)")).toBeInTheDocument();
  });

  it("se a própria pessoa sai com a página aberta, vai para a home", () => {
    const service = criarSessaoFalsa();
    montar(service);

    act(() => service.logout({ voluntaria: true }));

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("depois de sair, abrir uma página privada ainda pede o login", () => {
    const service = criarSessaoFalsa();
    render(
      <MemoryRouter initialEntries={["/colecao"]}>
        <AuthProvider service={service}>
          <Routes>
            <Route path="/" element={<Link to="/colecao">Ir para a coleção</Link>} />
            <Route path="/login" element={<PaginaLogin />} />
            <Route element={<RotaPrivada />}>
              <Route path="/colecao" element={<p>Minha coleção</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    act(() => service.logout({ voluntaria: true }));
    act(() => screen.getByRole("link", { name: "Ir para a coleção" }).click());

    expect(screen.getByText("Login (veio de /colecao)")).toBeInTheDocument();
  });
});
