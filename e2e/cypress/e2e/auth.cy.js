describe("Autenticação", () => {
  before(() => {
    cy.task("resetarBanco");
  });

  it("entra pela tela com o ash", () => {
    cy.env(["senhaDemo"], { log: false }).then(({ senhaDemo }) => {
      cy.visit("/login");
      cy.findByLabelText("E-mail").type("ash@pokebox.dev");
      cy.findByLabelText("Senha").type(senhaDemo, { log: false });
      cy.findByRole("button", { name: "Entrar" }).click();
    });

    cy.location("pathname").should("eq", "/");
    cy.findByRole("button", { name: /Menu do usuário/ }).should("be.visible");
  });

  it("mostra erro com a senha errada", () => {
    cy.visit("/login");
    cy.findByLabelText("E-mail").type("ash@pokebox.dev");
    cy.findByLabelText("Senha").type("senha-errada-123");
    cy.findByRole("button", { name: "Entrar" }).click();

    cy.findByText("E-mail ou senha inválidos").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("manda para o login quem abre uma página privada sem entrar", () => {
    cy.visit("/colecao");
    cy.location("pathname").should("eq", "/login");
  });

  it("volta para a página privada depois de entrar pela tela", () => {
    cy.env(["senhaDemo"], { log: false }).then(({ senhaDemo }) => {
      cy.visit("/colecao");
      cy.location("pathname").should("eq", "/login");
      cy.findByLabelText("E-mail").type("misty@pokebox.dev");
      cy.findByLabelText("Senha").type(senhaDemo, { log: false });
      cy.findByRole("button", { name: "Entrar" }).click();
    });

    cy.location("pathname").should("eq", "/colecao");
    cy.findByRole("heading", { name: "Minha coleção" }).should("be.visible");
  });

  it("reaproveita a sessão com cy.login", () => {
    cy.login("ash@pokebox.dev");
    cy.visit("/colecao");
    cy.findByRole("heading", { name: "Minha coleção" }).should("be.visible");
    cy.findByRole("button", { name: "Olá, Ash. Menu do usuário" }).should("be.visible");
  });
});
