describe("Anúncio", () => {
  beforeEach(() => {
    cy.task("resetarBanco");
  });

  it("anuncia o Rowlet pela coleção e o anúncio aparece no marketplace", () => {
    cy.login("ash@pokebox.dev");
    cy.visit("/colecao");

    cy.contains("article", "Rowlet").within(() => {
      cy.findByRole("button", { name: "Anunciar" }).click();
    });
    cy.findByLabelText("Quantidade para troca").clear().type("1");
    cy.findByLabelText("Descrição (opcional)").type("Rowlet do teste E2E");
    cy.findByRole("button", { name: "Criar anúncio" }).click();

    cy.findByText("Anúncio criado. Veja em Meus anúncios.").should("be.visible");

    cy.visit("/marketplace");
    cy.findByRole("searchbox", { name: "Buscar no marketplace" }).type("rowlet{enter}");
    cy.location("search").should("contain", "q=rowlet");

    cy.findByRole("region", { name: "Anúncios do marketplace" }).within(() => {
      cy.findByText("1 anúncio nesta página").should("be.visible");
      cy.findByRole("link", { name: "@ash" }).should("be.visible");
      cy.findByText("Seu anúncio").should("be.visible");
    });
  });
});
