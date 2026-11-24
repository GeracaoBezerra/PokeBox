import { Suspense, useRef } from "react";
import { Outlet } from "react-router-dom";
import Header from "../header/header";
import CarregandoPagina from "../CarregandoPagina/CarregandoPagina";
import Footer from "../footer/footer";
import s from "./MainLayout.module.css";

function MainLayout() {
  const conteudo = useRef(null);

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
        <Suspense fallback={<CarregandoPagina />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default MainLayout;
