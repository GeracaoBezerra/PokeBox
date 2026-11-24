import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import RotaPrivada from "../RotaPrivada/RotaPrivada";
import MenuUsuario from "./MenuUsuario";

function Endereco() {
  const location = useLocation();
  return <p>Em {location.pathname}{location.state?.de ? ` vindo de ${location.state.de}` : ""}</p>;
}

const nomeDoBotao = "Menu da conta de Ash Ketchum";

describe("MenuUsuario", () => {
  it("sair numa página privada leva à home, não ao login", async () => {
    renderWithProviders(
      <>
        <MenuUsuario />
        <Routes>
          <Route path="/" element={<Endereco />} />
          <Route path="/login" element={<Endereco />} />
          <Route element={<RotaPrivada />}>
            <Route path="/colecao" element={<p>Minha coleção</p>} />
          </Route>
        </Routes>
      </>,
      { rota: "/colecao" }
    );

    await userEvent.click(screen.getByRole("button", { name: nomeDoBotao }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sair" }));

    expect(await screen.findByText("Em /")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
  });

  it("mostra o avatar com as iniciais e o primeiro nome, sem o 'Olá'", () => {
    renderWithProviders(<MenuUsuario />);

    const botao = screen.getByRole("button", { name: nomeDoBotao });
    expect(botao).toHaveTextContent(/^AKAsh$/);
    expect(botao).not.toHaveTextContent("Olá");
  });

  it("a cor do avatar acompanha o username, não o nome", () => {
    const corDe = (user) => {
      const { unmount } = renderWithProviders(<MenuUsuario />, { service: criarSessaoFalsa(user) });
      const cor = screen.getByText(user.name.split(" ").map((p) => p[0]).join("")).style.backgroundColor;
      unmount();
      return cor;
    };

    const ash = corDe({ name: "Ash Ketchum", username: "ash" });
    expect(ash).toMatch(/^var\(--tipo-[a-z]+\)$/);
    expect(corDe({ name: "Outro Nome", username: "ash" })).toBe(ash);
  });

  it("lista os atalhos da conta, com o perfil público do username", async () => {
    renderWithProviders(<MenuUsuario />);
    await userEvent.click(screen.getByRole("button", { name: nomeDoBotao }));

    const menu = screen.getByRole("menu", { name: nomeDoBotao });
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Meu perfil",
      "Meu perfil público",
      "Minha coleção",
      "Wishlist",
      "Sair",
    ]);
    expect(screen.getByRole("menuitem", { name: "Meu perfil público" })).toHaveAttribute("href", "/u/ash");
    expect(screen.getByText("@ash")).toBeInTheDocument();
  });

  it("anda pelo menu com o teclado e o Esc devolve o foco ao botão", async () => {
    const pessoa = userEvent.setup();
    renderWithProviders(<MenuUsuario />);
    const botao = screen.getByRole("button", { name: nomeDoBotao });

    botao.focus();
    await pessoa.keyboard("{Enter}");
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toHaveFocus();

    await pessoa.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Meu perfil público" })).toHaveFocus();

    await pessoa.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Sair" })).toHaveFocus();

    await pessoa.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toHaveFocus();

    await pessoa.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Sair" })).toHaveFocus();

    await pessoa.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Meu perfil" })).toHaveFocus();

    await pessoa.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  it("seta para cima no botão abre o menu no último item e Tab fecha", async () => {
    const pessoa = userEvent.setup();
    renderWithProviders(<MenuUsuario />);
    const botao = screen.getByRole("button", { name: nomeDoBotao });

    botao.focus();
    await pessoa.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Sair" })).toHaveFocus();

    await pessoa.tab();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
