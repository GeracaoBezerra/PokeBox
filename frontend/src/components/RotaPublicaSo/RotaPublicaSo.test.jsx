import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/authProvider";
import LoginPage from "../../pages/login/login";
import RegisterPage from "../../pages/register/register";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import RotaPublicaSo from "./RotaPublicaSo";

const ash = { name: "Ash Ketchum", username: "ash" };

function Endereco() {
  const location = useLocation();
  return <p>Em {location.pathname + location.search}</p>;
}

function servicoQueEntra() {
  const service = criarSessaoFalsa(null);
  const entrar = async () => {
    service.entrar(ash);
    return { ok: true, user: ash };
  };
  return { ...service, login: entrar, register: entrar };
}

function montar(service, entrada) {
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <AuthProvider service={service}>
        <Routes>
          <Route element={<RotaPublicaSo />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="*" element={<Endereco />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("RotaPublicaSo", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  });

  it.each(["/login", "/register"])("com sessão, %s manda para a home", (caminho) => {
    montar(criarSessaoFalsa(ash), caminho);

    expect(screen.getByText("Em /")).toBeInTheDocument();
  });

  it("com sessão e uma página de origem, manda para ela", () => {
    montar(criarSessaoFalsa(ash), { pathname: "/login", state: { de: "/colecao?page=2" } });

    expect(screen.getByText("Em /colecao?page=2")).toBeInTheDocument();
  });

  it("sem sessão mostra o login", () => {
    montar(criarSessaoFalsa(null), "/login");

    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("entrar pelo login volta para a página de origem, não para a home", async () => {
    montar(servicoQueEntra(), { pathname: "/login", state: { de: "/colecao?q=pikachu" } });

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Em /colecao?q=pikachu")).toBeInTheDocument();
  });

  it("do login para Criar conta, o cadastro também volta para a página de origem", async () => {
    montar(servicoQueEntra(), { pathname: "/login", state: { de: "/colecao" } });

    await userEvent.click(screen.getByRole("link", { name: "Criar conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Em /colecao")).toBeInTheDocument();
  });

  it("do cadastro para Entrar, o login também volta para a página de origem", async () => {
    montar(servicoQueEntra(), { pathname: "/register", state: { de: "/procuro" } });

    await userEvent.click(screen.getByRole("link", { name: "Entrar" }));
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Em /procuro")).toBeInTheDocument();
  });

  it("cadastro sem página de origem vai para a home", async () => {
    montar(servicoQueEntra(), "/register");

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Em /")).toBeInTheDocument();
  });
});
