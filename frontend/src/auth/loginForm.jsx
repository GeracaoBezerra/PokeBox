import { useState } from "react";
import Field from "../components/ui/field";
import { useLoginForm } from "../hooks/useLoginForm";

export default function LoginForm({ onSuccess }) {
  const { values, errors, message, loading, setField, submit } = useLoginForm(onSuccess);
  const [show, setShow] = useState(false);

  return (
    <form onSubmit={submit} noValidate>
      <Field htmlFor="email" label="E-mail" error={errors.email}>
        <input id="email" type="email" autoComplete="email" placeholder="ash@pallet.town"
          value={values.email} onChange={setField("email")} aria-invalid={!!errors.email} />
      </Field>

      <Field htmlFor="password" label="Senha" error={errors.password}>
        <div className="field">
          <input id="password" type={show ? "text" : "password"} autoComplete="current-password"
            placeholder="••••••••" value={values.password} onChange={setField("password")}
            aria-invalid={!!errors.password} />
          <button type="button" className="eye" onClick={() => setShow((s) => !s)}>
            {show ? "ocultar" : "mostrar"}
          </button>
        </div>
      </Field>

      <button className="go" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
      <div className={`msg ${message.kind}`} role="status" aria-live="polite">{message.text}</div>
    </form>
  );
}
