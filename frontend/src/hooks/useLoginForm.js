import { useState } from "react";
import { useAuthService } from "../auth/useAuthService";

export function useLoginForm(onSuccess) {
  const auth = useAuthService();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: "", kind: "" });
  const [loading, setLoading] = useState(false);

  const setField = (name) => (e) =>
    setValues((v) => ({ ...v, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage({ text: "", kind: "" });
    setLoading(true);

    const r = await auth.login({
      email: values.email.trim(),
      password: values.password,
    });

    setLoading(false);

    if (r.ok) {
      setMessage({ text: `Bem-vindo, ${r.user.name}!`, kind: "ok" });
      onSuccess?.(r.user);
    } else if (r.errors) {
      setErrors(r.errors);
    } else {
      setMessage({ text: r.message, kind: "error" });
    }
  };

  return { values, errors, message, loading, setField, submit };
}