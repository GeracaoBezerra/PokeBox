import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AcoesRapidas from "./AcoesRapidas";

describe("AcoesRapidas", () => {
  it("chama onQuero e onTenho pelos botões", async () => {
    const onQuero = vi.fn();
    const onTenho = vi.fn();
    render(<AcoesRapidas nome="Pikachu" onQuero={onQuero} onTenho={onTenho} />);

    const quero = screen.getByRole("button", { name: "Quero Pikachu" });
    expect(quero).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(quero);
    await userEvent.click(screen.getByRole("button", { name: "Tenho Pikachu: adicionar à coleção" }));

    expect(onQuero).toHaveBeenCalledTimes(1);
    expect(onTenho).toHaveBeenCalledTimes(1);
  });

  it("marca o Quero como pressionado quando a carta está na wishlist", () => {
    render(<AcoesRapidas nome="Pikachu" naWishlist onQuero={() => {}} onTenho={() => {}} />);

    expect(screen.getByRole("button", { name: "Tirar Pikachu da wishlist" })).toHaveAttribute("aria-pressed", "true");
  });

  it("desabilita o Quero de quem já tem a carta, mas deixa o Tenho", () => {
    render(<AcoesRapidas nome="Pikachu" tenho onQuero={() => {}} onTenho={() => {}} />);

    expect(screen.getByRole("button", { name: "Você já tem esta carta" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adicionar outra versão de Pikachu à coleção" })).toBeEnabled();
  });

  it("desabilita o Quero enquanto a wishlist atualiza", () => {
    render(<AcoesRapidas nome="Pikachu" ocupado onQuero={() => {}} onTenho={() => {}} />);

    expect(screen.getByRole("button", { name: "Quero Pikachu" })).toBeDisabled();
  });
});
