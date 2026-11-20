describe("Troca entre dois colecionadores", () => {
  beforeEach(() => {
    cy.task("resetarBanco");
  });

  it("ash anuncia o Rowlet, misty oferece o Psyduck e as cartas trocam de dono", () => {
    cy.login("ash@pokebox.dev");
    cy.visit("/colecao");
    cy.intercept("POST", "**/listings").as("criarAnuncio");
    cy.contains("tr", "Rowlet").within(() => {
      cy.findByRole("button", { name: "Anunciar" }).click();
    });
    cy.findByLabelText("Quantidade para troca").clear().type("1");
    cy.findByLabelText("Descrição (opcional)").type("Rowlet para a troca do E2E");
    cy.findByRole("button", { name: "Criar anúncio" }).click();
    cy.findByText("Anúncio criado. Veja em Meus anúncios.").should("be.visible");

    cy.wait("@criarAnuncio").its("response.body.data.listing.id").then((idAnuncio) => {
      cy.login("misty@pokebox.dev");
      cy.visit(`/marketplace/${idAnuncio}`);
    });
    cy.findByRole("heading", { name: "Monte sua oferta" }).should("be.visible");
    cy.findByRole("searchbox", { name: "Buscar na sua coleção" }).type("psyduck");
    cy.findByRole("checkbox", { name: "Oferecer Psyduck" }).check();
    cy.findByRole("spinbutton", { name: "Quantidade de Psyduck oferecida" }).should("have.value", "1");
    cy.findByRole("button", { name: "Enviar oferta" }).click();
    cy.findByText("Oferta enviada! Acompanhe a resposta em Propostas.").should("be.visible");

    cy.login("ash@pokebox.dev");
    cy.visit("/propostas");
    cy.findByRole("tab", { name: "Recebidas" }).should("have.attr", "aria-selected", "true");
    cy.contains('[data-cy="cartao-oferta"]', "Rowlet").within(() => {
      cy.findByText(/De @misty/).should("be.visible");
      cy.findByRole("button", { name: "Aceitar" }).click();
    });
    cy.findByRole("dialog", { name: "Aceitar a oferta de @misty?" }).within(() => {
      cy.findByRole("button", { name: "Aceitar oferta" }).click();
    });
    cy.findByText("Oferta aceita.").should("be.visible");

    cy.login("misty@pokebox.dev");
    cy.visit("/propostas");
    cy.findByRole("tab", { name: "Enviadas" }).click();
    cy.findByRole("tab", { name: "Enviadas" }).should("have.attr", "aria-selected", "true");
    cy.contains('[data-cy="cartao-oferta"]', "Rowlet").within(() => {
      cy.findByRole("button", { name: "Criar troca" }).click();
    });
    cy.findByText("Troca criada: as cartas dos dois lados estão reservadas. Veja em Trocas.").should("be.visible");

    cy.login("ash@pokebox.dev");
    cy.visit("/trocas");
    cy.contains('[data-cy="cartao-troca"]', "Rowlet").within(() => {
      cy.findByRole("button", { name: "Concluir troca" }).click();
    });
    cy.findByRole("dialog", { name: "Concluir a troca com @misty?" }).within(() => {
      cy.findByRole("button", { name: "Concluir troca" }).click();
    });
    cy.findByText("Troca concluída: as cartas mudaram de dono.").should("be.visible");

    cy.visit("/colecao");
    cy.contains("tr", "Psyduck").should("be.visible");

    cy.login("misty@pokebox.dev");
    cy.visit("/colecao");
    cy.contains("tr", "Rowlet").should("be.visible");
  });
});
