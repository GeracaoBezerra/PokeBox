import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../header/header";
import Footer from "../footer/footer";
import styles from "./MainLayout.module.css";

function MainLayout() {
  return (
    <>
      <Header />
      <main className={styles.conteudo}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default MainLayout;