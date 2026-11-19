import { describe, expect, it } from "vitest";
import { errosPorCampo, mensagemAmigavel } from "./mensagens";

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

describe("errosPorCampo", () => {
  it("devolve um objeto vazio sem details", () => {
    expect(errosPorCampo(undefined)).toEqual({});
    expect(errosPorCampo([])).toEqual({});
  });

  it("transforma a lista da API em { campo: mensagem }", () => {
    expect(
      errosPorCampo([
        { field: "phone", message: "Telefone com DDD, só números" },
        { field: "cep", message: "CEP com 8 dígitos" },
      ])
    ).toEqual({ phone: "Telefone com DDD, só números", cep: "CEP com 8 dígitos" });
  });

  it("fica com a primeira mensagem de cada campo", () => {
    expect(
      errosPorCampo([
        { field: "quantity", message: "Primeira" },
        { field: "quantity", message: "Segunda" },
      ])
    ).toEqual({ quantity: "Primeira" });
  });

  it("ignora o detalhe sem nome de campo", () => {
    expect(errosPorCampo([{ field: "", message: "Geral" }, { message: "Sem campo" }])).toEqual({});
  });

  it("mantém o caminho com ponto dos campos de lista", () => {
    expect(errosPorCampo([{ field: "items.0.quantity", message: "Pelo menos 1" }])).toEqual({
      "items.0.quantity": "Pelo menos 1",
    });
  });
});

describe("mensagemAmigavel com erro por campo", () => {
  const erro400 = {
    status: 400,
    message: "Telefone com DDD, só números",
    details: [{ field: "phone", message: "Telefone com DDD, só números" }],
  };

  it("pede para conferir os campos quando todos estão marcados na tela", () => {
    expect(mensagemAmigavel(erro400, ["phone", "cep"])).toBe("Confira os campos destacados.");
  });

  it("mostra a mensagem do campo que a tela não marca", () => {
    const erro = {
      status: 400,
      message: "Dados inválidos",
      details: [
        { field: "quantity", message: "Quantidade inválida" },
        { field: "items.0.quantity", message: "Pelo menos 1 cópia" },
      ],
    };
    expect(mensagemAmigavel(erro, ["quantity"])).toBe("Pelo menos 1 cópia");
  });

  it("sem campos marcados, mostra a mensagem do primeiro campo", () => {
    expect(mensagemAmigavel(erro400)).toBe("Telefone com DDD, só números");
  });

  it("400 sem details continua com a mensagem da API", () => {
    expect(mensagemAmigavel({ status: 400, message: "Anúncio fechado" }, ["quantity"])).toBe("Anúncio fechado");
  });
});
