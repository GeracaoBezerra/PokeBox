import { useNavigate } from "react-router-dom";
import AuthLayout from "../../auth/authLayout";
import LoginForm from "../../auth/loginForm";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      subtitle="Entre para gerenciar sua coleção, wishlist e trocas."
      footerText="Novo treinador?"
      footerLinkTo="/register"
      footerLinkLabel="Criar conta"
    >
      <LoginForm onSuccess={() => navigate("/")} />
    </AuthLayout>
  );
}