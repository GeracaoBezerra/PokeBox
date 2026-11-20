function senhaDoUsuario(senha) {
  if (senha) return cy.wrap(senha, { log: false });
  return cy.env(["senhaDemo"], { log: false }).then(({ senhaDemo }) => senhaDemo);
}

Cypress.Commands.add("login", (email, senha) => {
  const api = Cypress.expose("apiUrl");

  senhaDoUsuario(senha).then((senhaUsada) => {
    cy.session(email, () => {
      cy.request({ method: "POST", url: `${api}/auth/login`, body: { email, password: senhaUsada }, log: false })
        .then(({ body }) => {
          const { token, user } = body.data;
          window.localStorage.setItem("pokebox.token", token);
          window.localStorage.setItem("pokebox.user", JSON.stringify({ name: user.name, username: user.username }));
        });
    }, {
      validate() {
        cy.window().then((win) => {
          cy.request({
            url: `${api}/auth/me`,
            headers: { Authorization: `Bearer ${win.localStorage.getItem("pokebox.token")}` },
            log: false,
          });
        });
      },
    });
  });
});

Cypress.Commands.add("loginAdmin", () => {
  cy.env(["senhaAdmin"], { log: false }).then(({ senhaAdmin }) => {
    cy.login("admin@pokebox.dev", senhaAdmin);
  });
});
