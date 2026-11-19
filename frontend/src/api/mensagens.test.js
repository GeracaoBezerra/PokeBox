import { describe, expect, it } from "vitest";
import { mensagemAmigavel } from "./mensagens";

describe("mensagemAmigavel", () => {
  it("devolve texto vazio sem erro", () => {
    expect(mensagemAmigavel(null)).toBe("");
  });

  it("explica quando não deu para falar com o servidor", () => {
    expect(mensagemAmigavel({ status: 0, message: "Não foi possível conectar ao servidor." })).toBe(
      "Não conseguimos falar com o servidor. Confira sua internet e tente de novo."
    );
  });

  it("esconde a mensagem técnica dos erros 5xx", () => {
    expect(mensagemAmigavel({ status: 500, message: "PrismaClientKnownRequestError" })).toBe(
      "Algo deu errado do nosso lado. Tente de novo em instantes."
    );
    expect(mensagemAmigavel({ status: 503, message: "" })).toBe("Algo deu errado do nosso lado. Tente de novo em instantes.");
  });

  it("usa a mensagem da API quando ela existe", () => {
    expect(mensagemAmigavel({ status: 409, message: "Você já tem uma oferta aberta neste anúncio" })).toBe(
      "Você já tem uma oferta aberta neste anúncio"
    );
  });

  it("usa um texto padrão por status quando a API não manda mensagem", () => {
    expect(mensagemAmigavel({ status: 403, message: "" })).toBe("Você não tem permissão para fazer isso.");
    expect(mensagemAmigavel({ status: 404, message: "" })).toBe("Não encontramos o que você procurou.");
  });

  it("usa um texto genérico para os outros status sem mensagem", () => {
    expect(mensagemAmigavel({ status: 418, message: "" })).toBe("Não foi possível concluir. Tente de novo.");
  });
});
