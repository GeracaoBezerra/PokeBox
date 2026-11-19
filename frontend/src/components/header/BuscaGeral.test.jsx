import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BuscaGeral from "./BuscaGeral";

function Endereco() {
  const { pathname, search } = useLocation();
  return <output aria-label="endereço">{pathname + search}</output>;
}

function renderizar(inicio) {
  return render(
    <MemoryRouter initialEntries={[inicio]}>
      <BuscaGeral />
      <Link to="/catalogo">Cards</Link>
      <Endereco />
    </MemoryRouter>
  );
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("BuscaGeral", () => {
  it("descarta o rascunho ao trocar de página, mesmo com o termo da URL igual, e não busca sozinha na página nova", async () => {
    const pessoa = userEvent.setup();
    renderizar("/");

    await pessoa.type(screen.getByRole("searchbox", { name: "Buscar cartas" }), "pikachu");
    await pessoa.click(screen.getByRole("link", { name: "Cards" }));

    expect(screen.getByRole("searchbox", { name: "Buscar cartas" })).toHaveValue("");
    await esperar(500);
    expect(screen.getByLabelText("endereço")).toHaveTextContent(/^\/catalogo$/);
  });

  it("na página de resultados, busca sozinha depois de parar de digitar", async () => {
    const pessoa = userEvent.setup();
    renderizar("/catalogo");

    await pessoa.type(screen.getByRole("searchbox", { name: "Buscar cartas" }), "pikachu");
    await esperar(500);

    expect(screen.getByLabelText("endereço")).toHaveTextContent("/catalogo?name=pikachu");
    expect(screen.getByRole("searchbox", { name: "Buscar cartas" })).toHaveValue("pikachu");
  });
});
