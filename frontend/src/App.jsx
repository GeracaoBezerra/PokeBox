import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout/MainLayout";
import HomePage from "./pages/home";
import { LoginPage, RegisterPage } from "./pages/index";

function App() {
  return (
    <Routes>
      {/* Telas cheias, sem Header/Footer */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Páginas com Header/Footer */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  );
}

export default App;