import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ErroCampo from "./ErroCampo";

describe("ErroCampo", () => {
  it("não mostra nada sem mensagem", () => {
    const { container } = render(<ErroCampo id="qtd-erro" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("descreve o campo ligado pelo aria-describedby", () => {
    render(
      <>
        <label htmlFor="qtd">Quantidade</label>
        <input id="qtd" aria-invalid="true" aria-describedby="qtd-erro" />
        <ErroCampo id="qtd-erro" mensagem="Quantidade maior que a disponível" />
      </>
    );

    const campo = screen.getByRole("textbox", { name: "Quantidade" });
    expect(campo).toBeInvalid();
    expect(campo).toHaveAccessibleDescription("Quantidade maior que a disponível");
  });
});
