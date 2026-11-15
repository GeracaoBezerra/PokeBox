import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout/MainLayout";
import RotaPrivada from "./components/RotaPrivada/RotaPrivada";
import HomePage from "./pages/home";
import {
  CardPage,
  CatalogPage,
  ListingPage,
  LoginPage,
  MarketplacePage,
  MyCollectionPage,
  MyListingsPage,
  MyOffersPage,
  PublicPerfilPage,
  RegisterPage,
  SwitchNegociationPage,
  UserPerfilPage,
  WishlistPage,
} from "./pages/index";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/cards/:id" element={<CardPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:id" element={<ListingPage />} />
        <Route path="/u/:username" element={<PublicPerfilPage />} />

        <Route element={<RotaPrivada />}>
          <Route path="/colecao" element={<MyCollectionPage />} />
          <Route path="/procuro" element={<WishlistPage />} />
          <Route path="/wishlist" element={<Navigate to="/procuro" replace />} />
          <Route path="/anuncios" element={<MyListingsPage />} />
          <Route path="/propostas" element={<MyOffersPage />} />
          <Route path="/trocas" element={<SwitchNegociationPage />} />
          <Route path="/perfil" element={<UserPerfilPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
