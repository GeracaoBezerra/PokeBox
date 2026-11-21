describe("Troca entre dois colecionadores", () => {
  beforeEach(() => {
    cy.task("resetarBanco");
  });

  it("ash anuncia o Rowlet, misty oferece o Psyduck, o aceite cria a troca e, com as duas confirmações, as cartas trocam de dono", () => {
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
    cy.location("pathname").should("eq", "/propostas");
    cy.location("search").should("eq", "?aba=enviadas");
    cy.findByText("Oferta enviada para @ash.").should("be.visible");
    cy.findByRole("tab", { name: "Enviadas" }).should("have.attr", "aria-selected", "true");
    cy.contains('[data-cy="cartao-oferta"]', "Rowlet").should("be.visible");
    cy.go("back");
    cy.findByRole("heading", { name: "Você já fez uma oferta aqui" }).should("be.visible");
    cy.findByRole("heading", { name: "Monte sua oferta" }).should("not.exist");

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
    cy.findByText("Oferta aceita: a troca foi criada e as cartas estão reservadas.").should("be.visible");
    cy.location("pathname").should("eq", "/trocas");
    cy.location("search").should("eq", "?aba=recebidas&status=PROPOSED");
    cy.contains('[data-cy="cartao-troca"]', "Rowlet").within(() => {
      cy.findByText("Confirme quando receber as cartas.").should("be.visible");
      cy.findByRole("button", { name: "Confirmar recebimento" }).should("be.visible");
    });

    cy.login("misty@pokebox.dev");
    cy.visit("/propostas?aba=enviadas");
    cy.contains('[data-cy="cartao-oferta"]', "Rowlet").within(() => {
      cy.findByText("Virou troca").should("be.visible");
      cy.findByRole("button", { name: "Cancelar oferta" }).should("not.exist");
      cy.findByRole("link", { name: "Ver troca" }).click();
    });
    cy.location("search").should("eq", "?aba=enviadas&status=PROPOSED");
    cy.findByRole("tab", { name: "Enviadas" }).should("have.attr", "aria-selected", "true");
    cy.contains('[data-cy="cartao-troca"]', "Rowlet").within(() => {
      cy.findByRole("button", { name: "Confirmar recebimento" }).click();
    });
    cy.findByRole("dialog", { name: "Confirmar que recebeu as cartas?" }).within(() => {
      cy.findByText(/Você dá: 1× Psyduck\. Você recebe: 1× Rowlet\./).should("be.visible");
      cy.findByRole("button", { name: "Confirmar recebimento" }).click();
    });
    cy.findByText("Recebimento confirmado. Aguardando @ash confirmar.").should("be.visible");
    cy.contains('[data-cy="cartao-troca"]', "Rowlet").within(() => {
      cy.findByText("Você confirmou. Aguardando @ash confirmar.").should("be.visible");
      cy.findByRole("button", { name: "Confirmar recebimento" }).should("not.exist");
    });

    cy.login("ash@pokebox.dev");
    cy.visit("/trocas");
    cy.contains('[data-cy="cartao-troca"]', "Rowlet").within(() => {
      cy.findByText("@misty já confirmou. Confirme quando receber as cartas.").should("be.visible");
      cy.findByRole("button", { name: "Confirmar recebimento" }).click();
    });
    cy.findByRole("dialog", { name: "Confirmar que recebeu as cartas?" }).within(() => {
      cy.findByRole("button", { name: "Confirmar recebimento" }).click();
    });
    cy.findByText("Troca concluída: as cartas mudaram de dono.").should("be.visible");

    cy.visit("/colecao");
    cy.contains("tr", "Psyduck").should("be.visible");

    cy.login("misty@pokebox.dev");
    cy.visit("/colecao");
    cy.contains("tr", "Rowlet").should("be.visible");

    cy.visit("/propostas?aba=enviadas");
    cy.contains('[data-cy="cartao-oferta"]', "Rowlet").within(() => {
      cy.findByText("Troca concluída").should("be.visible");
      cy.findByRole("region", { name: "Você dá" }).findByRole("link", { name: "Psyduck" }).should("be.visible");
      cy.findByRole("link", { name: "Ver troca" }).should("have.attr", "href", "/trocas?aba=enviadas&status=ACCEPTED");
    });
  });
});
