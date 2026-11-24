import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../header/header";
import CarregandoPagina from "../CarregandoPagina/CarregandoPagina";
import Footer from "../footer/footer";

function MainLayout() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<CarregandoPagina />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default MainLayout;