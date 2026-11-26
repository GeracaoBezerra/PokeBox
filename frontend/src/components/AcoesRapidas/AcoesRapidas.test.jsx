import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AcoesRapidas from "./AcoesRapidas";

describe("AcoesRapidas", () => {
  it("chama onQuero e onTenho pelos botões", async () => {
    const onQuero = vi.fn();
    const onTenho = vi.fn();
    render(<AcoesRapidas nome="Pikachu" onQuero={onQuero} onTenho={onTenho} />);

    const quero = screen.getByRole("button", { name: "Adicionar Pikachu à wishlist" });
    expect(quero).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(quero);
    await userEvent.click(screen.getByRole("button", { name: "Tenho Pikachu: adicionar à coleção" }));

    expect(onQuero).toHaveBeenCalledTimes(1);
    expect(onTenho).toHaveBeenCalledTimes(1);
  });

  it("marca o Quero como pressionado quando a carta está na wishlist", () => {
    render(<AcoesRapidas nome="Pikachu" naWishlist onQuero={() => {}} onTenho={() => {}} />);

    expect(screen.getByRole("button", { name: "Remover Pikachu da wishlist" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Remover Pikachu da wishlist" })).toHaveTextContent("Wishlist");
  });

  it("mostra apenas Editar quando a carta já está na coleção", async () => {
    const onEditar = vi.fn();
    render(<AcoesRapidas nome="Pikachu" tenho onEditar={onEditar} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar Pikachu" }));
    expect(onEditar).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /Quero/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tenho/ })).not.toBeInTheDocument();
  });

  it("desabilita o Quero enquanto a wishlist atualiza", () => {
    render(<AcoesRapidas nome="Pikachu" ocupado onQuero={() => {}} onTenho={() => {}} />);

    expect(screen.getByRole("button", { name: "Adicionar Pikachu à wishlist" })).toBeDisabled();
  });

  it("bloqueado desabilita os dois botões", () => {
    render(<AcoesRapidas nome="Pikachu" bloqueado onQuero={() => {}} onTenho={() => {}} />);

    expect(screen.getByRole("button", { name: "Adicionar Pikachu à wishlist" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tenho Pikachu: adicionar à coleção" })).toBeDisabled();
  });
});
