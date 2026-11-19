import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Aviso from "./Aviso";

describe("Aviso", () => {
  it("não mostra nada sem erro", () => {
    const { container } = render(<Aviso />);

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a mensagem do erro sem o código HTTP", () => {
    render(<Aviso erro={{ status: 409, message: "Você já tem uma oferta aberta neste anúncio" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/^Você já tem uma oferta aberta neste anúncio$/);
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("traduz o erro sem conexão", () => {
    render(<Aviso erro={{ status: 0, message: "Não foi possível conectar ao servidor." }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Não conseguimos falar com o servidor.");
  });

  it("oferece tentar de novo quando a API está fora do ar", async () => {
    const onTentarDeNovo = vi.fn();
    render(<Aviso erro={{ status: 503, message: "Serviço indisponível" }} onTentarDeNovo={onTentarDeNovo} />);

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it("oferece tentar de novo também no erro 500", () => {
    render(<Aviso erro={{ status: 500, message: "" }} onTentarDeNovo={() => {}} />);

    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
