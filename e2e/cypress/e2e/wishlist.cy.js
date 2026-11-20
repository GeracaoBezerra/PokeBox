describe("Wishlist", () => {
  beforeEach(() => {
    cy.task("resetarBanco");
    cy.login("ash@pokebox.dev");
  });

  it("remove o Zapdos da wishlist", () => {
    cy.visit("/procuro");
    cy.findByRole("heading", { name: "Wishlist" }).should("be.visible");

    cy.contains('[data-cy="item-wishlist"]', "Zapdos").should("be.visible");
    cy.get('[data-cy="item-wishlist"]')
      .its("length")
      .then((antes) => {
        cy.contains('[data-cy="item-wishlist"]', "Zapdos").within(() => {
          cy.findByRole("button", { name: "Remover" }).click();
        });

        cy.findByText("Zapdos saiu da wishlist.").should("be.visible");
        cy.get('[data-cy="item-wishlist"]').should("have.length", antes - 1).and("not.contain", "Zapdos");
      });
  });

  it("adiciona o Squirtle pela página da carta e ele aparece na wishlist", () => {
    cy.visit("/cards/base1-63?lang=en");

    cy.findByRole("button", { name: "Adicionar à wishlist" }, { timeout: 15000 }).click();
    cy.findByText("Carta adicionada à wishlist.", { timeout: 15000 }).should("be.visible");
    cy.findByRole("button", { name: "Remover da wishlist" }).should("be.visible");

    cy.visit("/procuro");
    cy.contains('[data-cy="item-wishlist"]', "Squirtle").should("be.visible");
  });
});
