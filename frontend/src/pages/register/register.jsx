import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../auth/authLayout";
import RegisterForm from "../../auth/registerForm";

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AuthLayout
      subtitle="Crie sua conta e comece a montar a coleção dos seus sonhos."
      footerText="Já tem conta?"
      footerLinkTo="/login"
      footerLinkLabel="Entrar"
    >
      <RegisterForm onSuccess={() => navigate(location.state?.de ?? "/", { replace: true })} />
    </AuthLayout>
  );
}
