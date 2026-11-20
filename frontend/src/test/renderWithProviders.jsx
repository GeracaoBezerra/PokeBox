import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/authProvider";
import ConfirmacaoProvider from "../components/ConfirmacaoProvider/ConfirmacaoProvider";
import ToastProvider from "../components/ToastProvider/ToastProvider";
import { criarSessaoFalsa } from "./sessaoFalsa";

export function renderWithProviders(ui, { rota = "/", service = criarSessaoFalsa() } = {}) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <AuthProvider service={service}>
          <ConfirmacaoProvider>{ui}</ConfirmacaoProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}
