import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import RotaPrivada from "../RotaPrivada/RotaPrivada";
import MenuUsuario from "./MenuUsuario";

function Endereco() {
  const location = useLocation();
  return <p>Em {location.pathname}{location.state?.de ? ` vindo de ${location.state.de}` : ""}</p>;
}

describe("MenuUsuario", () => {
  it("sair numa página privada leva à home, não ao login", async () => {
    renderWithProviders(
      <>
        <MenuUsuario />
        <Routes>
          <Route path="/" element={<Endereco />} />
          <Route path="/login" element={<Endereco />} />
          <Route element={<RotaPrivada />}>
            <Route path="/colecao" element={<p>Minha coleção</p>} />
          </Route>
        </Routes>
      </>,
      { rota: "/colecao" }
    );

    await userEvent.click(screen.getByRole("button", { name: "Olá, Ash. Menu do usuário" }));
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(await screen.findByText("Em /")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
  });
});
