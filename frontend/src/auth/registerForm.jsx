import { useState } from "react";
import Field from "../components/ui/field";
import { useRegisterForm } from "../hooks/useRegisterForm";

export default function RegisterForm({ onSuccess }) {
  const { values, errors, message, loading, setField, submit } =
    useRegisterForm(onSuccess);
  const [show, setShow] = useState(false);

  return (
    <form onSubmit={submit} noValidate>
      <Field htmlFor="name" label="Nome" error={errors.name}>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Ash Ketchum"
          value={values.name}
          onChange={setField("name")}
          aria-invalid={!!errors.name}
        />
      </Field>

      <Field htmlFor="username" label="Nome de usuário" error={errors.username}>
        <input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="ash_ketchum"
          value={values.username}
          onChange={setField("username")}
          aria-invalid={!!errors.username}
        />
      </Field>

      <Field htmlFor="email" label="E-mail" error={errors.email}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ash@pallet.town"
          value={values.email}
          onChange={setField("email")}
          aria-invalid={!!errors.email}
        />
      </Field>

      <Field htmlFor="password" label="Senha" error={errors.password}>
        <div className="field">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.password}
            onChange={setField("password")}
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            className="eye"
            onClick={() => setShow((s) => !s)}
          >
            {show ? "ocultar" : "mostrar"}
          </button>
        </div>
      </Field>

      <Field
        htmlFor="confirmPassword"
        label="Confirmar senha"
        error={errors.confirmPassword}
      >
        <input
          id="confirmPassword"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          value={values.confirmPassword}
          onChange={setField("confirmPassword")}
          aria-invalid={!!errors.confirmPassword}
        />
      </Field>

      <button className="go" type="submit" disabled={loading}>
        {loading ? "Criando conta…" : "Criar conta"}
      </button>
      <div className={`msg ${message.kind}`} role="status" aria-live="polite">
        {message.text}
      </div>
    </form>
  );
}