import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout/MainLayout";
import HomePage from "./pages/home";
import Perfil from "./components/Perfil/Perfil";


function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
