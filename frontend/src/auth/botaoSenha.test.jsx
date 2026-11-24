import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import LoginForm from "./loginForm";
import RegisterForm from "./registerForm";

describe.each([
  ["login", LoginForm],
  ["cadastro", RegisterForm],
])("botão de mostrar senha no %s", (_, Formulario) => {
  it("mantém o nome fixo, diz se está ligado com aria-pressed e mantém o texto visível", async () => {
    const usuario = userEvent.setup();
    renderWithProviders(<Formulario onSuccess={() => {}} />, { service: criarSessaoFalsa(null) });

    const botao = screen.getByRole("button", { name: "Mostrar senha" });
    expect(botao).toHaveAttribute("aria-pressed", "false");
    expect(botao).toHaveTextContent("mostrar");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");

    await usuario.click(botao);

    const ligado = screen.getByRole("button", { name: "Mostrar senha" });
    expect(ligado).toHaveAttribute("aria-pressed", "true");
    expect(ligado).toHaveTextContent("ocultar");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  });
});
