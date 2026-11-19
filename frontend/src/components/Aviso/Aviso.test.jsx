import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Aviso from "./Aviso";

describe("Aviso", () => {
  it("não mostra nada sem erro e sem sucesso", () => {
    const { container } = render(<Aviso />);

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a mensagem de sucesso", () => {
    render(<Aviso sucesso="Carta adicionada." />);

    expect(screen.getByRole("status")).toHaveTextContent("Carta adicionada.");
  });

  it("mostra o erro com o código", () => {
    render(<Aviso erro={{ status: 404, message: "Carta não encontrada" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Carta não encontrada (404)");
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("oferece tentar de novo quando a API está fora do ar", async () => {
    const onTentarDeNovo = vi.fn();
    render(<Aviso erro={{ status: 503, message: "Serviço indisponível" }} onTentarDeNovo={onTentarDeNovo} />);

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });
});
