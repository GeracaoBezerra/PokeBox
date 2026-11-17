import { Link } from "react-router-dom";
import BackgroundVideo from "../components/ui/backGroundVideo";
import Logo from "../components/Logo/Logo";
import "../styles/login.css";

export default function AuthLayout({
  subtitle,
  footerText,
  footerLinkTo,
  footerLinkLabel,
  children,
}) {
  return (
    <div className="login-page">
      <BackgroundVideo />
      <main className="card">
        <div className="logo">
          <Logo variante="simbolo" tamanho={80} />
          <span>Poke<b>Box</b></span>
        </div>
        <p className="sub">{subtitle}</p>

        {children}

        <div className="foot">
          {footerText} <Link to={footerLinkTo}>{footerLinkLabel}</Link>
        </div>
      </main>
    </div>
  );
}