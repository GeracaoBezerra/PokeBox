import { useState } from "react";
import { useAuthService } from "../auth/useAuthService";

export function useRegisterForm(onSuccess) {
  const auth = useAuthService();
  const [values, setValues] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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

    const r = await auth.register({
      name: values.name.trim(),
      username: values.username.trim(),
      email: values.email.trim(),
      password: values.password,
      confirmPassword: values.confirmPassword,
    });

    setLoading(false);

    if (r.ok) {
      setMessage({
        text: `Conta criada! Bem-vindo, ${r.user.name}.`,
        kind: "ok",
      });
      onSuccess?.(r.user);
    } else if (r.errors) {
      setErrors(r.errors);
    } else {
      setMessage({
        text: r.message || "Não foi possível criar a conta.",
        kind: "error",
      });
    }
  };

  return { values, errors, message, loading, setField, submit };
}