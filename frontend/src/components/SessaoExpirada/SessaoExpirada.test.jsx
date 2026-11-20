import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { avisarSessaoExpirada } from "../../auth/sessaoExpirada";
import ToastProvider from "../ToastProvider/ToastProvider";
import SessaoExpirada from "./SessaoExpirada";

function Login() {
  const location = useLocation();
  return <p>login, voltar para {location.state?.de}</p>;
}

describe("SessaoExpirada", () => {
  it("mostra o toast e leva ao login guardando a página de origem", () => {
    window.history.replaceState(null, "", "/colecao?ordem=nome");
    render(
      <MemoryRouter initialEntries={["/colecao"]}>
        <ToastProvider>
          <SessaoExpirada />
          <Routes>
            <Route path="/colecao" element={<p>coleção</p>} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    act(() => avisarSessaoExpirada());

    expect(screen.getByRole("status")).toHaveTextContent("Sua sessão expirou. Entre de novo.");
    expect(screen.getByText("login, voltar para /colecao?ordem=nome")).toBeInTheDocument();
  });
});
