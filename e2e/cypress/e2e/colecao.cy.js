describe("Coleção", () => {
  beforeEach(() => {
    cy.task("resetarBanco");
  });

  it("adiciona uma carta pela página da carta e ela aparece em Minha coleção", () => {
    cy.login("ash@pokebox.dev");
    cy.visit("/cards/base1-44?lang=en");

    cy.findByRole("heading", { name: "Sua coleção" }, { timeout: 15000 }).should("be.visible");
    cy.findByText("Você ainda não tem esta carta").should("be.visible");
    cy.contains("summary", "Adicionar à minha coleção").click();
    cy.findByRole("button", { name: "Adicionar à coleção" }).click();

    cy.findByText("Carta adicionada à coleção.", { timeout: 15000 }).should("be.visible");
    cy.findByText("1 cópia na sua coleção").should("be.visible");

    cy.visit("/colecao");
    cy.findByRole("heading", { name: "Minha coleção" }).should("be.visible");
    cy.contains("article", "Bulbasaur").should("contain", "Base Set");
  });
});
