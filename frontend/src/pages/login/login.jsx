import { useNavigate, Link } from "react-router-dom";
import BackgroundVideo from "../../components/ui/backGroundVideo";
import LoginForm from "../../auth/loginForm";
import Pokeball from "../../components/ui/pokeball";
import "../../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/");
  };

  return (
    <div className="login-page">
      <BackgroundVideo />
      <main className="card">
        <div className="logo"><Pokeball /><span>Poke<b>Box</b></span></div>
        <p className="sub">Entre para gerenciar sua coleção, wishlist e trocas.</p>
        <LoginForm onSuccess={handleSuccess} />
        <div className="foot">Novo treinador? <Link to="/register">Criar conta</Link></div>
      </main>
    </div>
  );
}