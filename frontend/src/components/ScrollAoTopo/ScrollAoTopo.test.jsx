import { act, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScrollAoTopo from "./ScrollAoTopo";

function Home() {
  return (
    <>
      <section id="como-funciona">Como funciona</section>
      <Link to="/outra">Ir para outra</Link>
    </>
  );
}

function Outra() {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/#como-funciona">Ir para Como funciona</Link>
      <button onClick={() => navigate(-1)}>Voltar</button>
    </>
  );
}

function montar(entrada) {
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <ScrollAoTopo />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/outra" element={<Outra />} />
      </Routes>
    </MemoryRouter>
  );
}

async function rolarJanelaPara(posicao) {
  fireEvent.wheel(window);
  window.scrollY = posicao;
  fireEvent.scroll(window);
  await act(() => new Promise((resolver) => requestAnimationFrame(resolver)));
}

describe("ScrollAoTopo", () => {
  let rolarAte;

  beforeEach(() => {
    rolarAte = vi.fn();
    Element.prototype.scrollIntoView = rolarAte;
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  });

  afterEach(() => {
    delete Element.prototype.scrollIntoView;
    window.scrollY = 0;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("link com hash rola até a seção", () => {
    montar("/outra");

    fireEvent.click(screen.getByRole("link", { name: "Ir para Como funciona" }));

    expect(rolarAte).toHaveBeenCalledTimes(1);
    expect(rolarAte.mock.instances[0]).toBe(document.getElementById("como-funciona"));
  });

  it("abrir o endereço com hash direto rola até a seção", () => {
    montar("/#como-funciona");

    expect(rolarAte).toHaveBeenCalledTimes(1);
  });

  it("voltar para um endereço com hash devolve a rolagem em vez de pular para a seção", async () => {
    montar("/#como-funciona");
    await rolarJanelaPara(640);
    fireEvent.click(screen.getByRole("link", { name: "Ir para outra" }));
    rolarAte.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.getByText("Como funciona")).toBeInTheDocument();
    expect(rolarAte).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, left: 0, behavior: "instant" });
  });
});
