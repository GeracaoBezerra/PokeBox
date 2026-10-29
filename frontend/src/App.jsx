import { useMemo } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { createAuthService } from "./auth/createAuthService";
import Header from "./components/header/header";
import Footer from "./components/footer/footer";
import * as Pages from "./pages";

function MainLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Sem header/footer */}
      <Route path="/login" element={<Pages.LoginPage />} />
      <Route path="/register" element={<Pages.RegisterPage />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<Pages.Home />} />
      </Route>
    </Routes>
  );
}