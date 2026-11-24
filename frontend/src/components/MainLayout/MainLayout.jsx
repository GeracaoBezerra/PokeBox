import { Suspense, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../header/header";
import CarregandoPagina from "../CarregandoPagina/CarregandoPagina";
import ErroDeTela from "../ErroDeTela/ErroDeTela";
import Footer from "../footer/footer";
import s from "./MainLayout.module.css";

function MainLayout() {
  const conteudo = useRef(null);
  const { pathname } = useLocation();

  function pularParaConteudo(evento) {
    evento.preventDefault();
    conteudo.current?.focus();
  }

  return (
    <>
      <a href="#conteudo" className={s.pularConteudo} onClick={pularParaConteudo}>
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" ref={conteudo} tabIndex={-1} className={s.conteudo}>
        <ErroDeTela key={pathname}>
          <Suspense fallback={<CarregandoPagina />}>
            <Outlet />
          </Suspense>
        </ErroDeTela>
      </main>
      <Footer />
    </>
  );
}

export default MainLayout;
