describe("Moderação pelo admin", () => {
  beforeEach(() => {
    cy.task("resetarBanco");
  });

  it("bloqueia o anúncio do Blastoise da misty e ele sai do marketplace", () => {
    cy.loginAdmin();
    cy.visit("/marketplace?q=blastoise");

    cy.findByRole("region", { name: "Anúncios do marketplace" }).within(() => {
      cy.findByText("1 anúncio nesta página").should("be.visible");
      cy.findByRole("link", { name: "@misty" }).should("be.visible");
      cy.findAllByRole("link", { name: /Blastoise/ }).first().click();
    });

    cy.location("pathname").should("match", /^\/marketplace\/.+/);
    cy.findByRole("region", { name: "Moderação do anúncio" }).within(() => {
      cy.findByRole("button", { name: "Bloquear" }).click();
    });
    cy.findByRole("dialog", { name: "Bloquear o anúncio de @misty?" }).within(() => {
      cy.findByRole("button", { name: "Bloquear" }).click();
    });
    cy.findByText("Anúncio bloqueado.").should("be.visible");
    cy.findByRole("region", { name: "Moderação do anúncio" }).within(() => {
      cy.findByRole("button", { name: "Desbloquear" }).should("be.visible");
    });

    cy.visit("/marketplace?q=blastoise");
    cy.findByRole("region", { name: "Anúncios do marketplace" }).within(() => {
      cy.findByRole("heading", { name: "Nenhum anúncio encontrado" }).should("be.visible");
      cy.findByRole("link", { name: "@misty" }).should("not.exist");
    });
  });
});
