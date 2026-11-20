import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../auth/authProvider";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import RotaPrivada from "./RotaPrivada";

function PaginaLogin() {
  const location = useLocation();
  return <p>Login (veio de {location.state?.de})</p>;
}

function montar(service, endereco = "/colecao") {
  render(
    <MemoryRouter initialEntries={[endereco]}>
      <AuthProvider service={service}>
        <Routes>
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

  it("se a sessão acaba com a página aberta, vai para o login", () => {
    const service = criarSessaoFalsa();
    montar(service);

    act(() => service.logout());

    expect(screen.getByText("Login (veio de /colecao)")).toBeInTheDocument();
  });
});
