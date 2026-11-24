import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import CarregandoPagina from "./components/CarregandoPagina/CarregandoPagina";
import MainLayout from "./components/MainLayout/MainLayout";
import RotaPrivada from "./components/RotaPrivada/RotaPrivada";
import RotaPublicaSo from "./components/RotaPublicaSo/RotaPublicaSo";
import HomePage from "./pages/home";

const LoginPage = lazy(() => import("./pages/login/login"));
const RegisterPage = lazy(() => import("./pages/register/register"));
const CatalogPage = lazy(() => import("./pages/catalog"));
const CardPage = lazy(() => import("./pages/card"));
const MarketplacePage = lazy(() => import("./pages/marketplace"));
const ListingPage = lazy(() => import("./pages/listing"));
const PublicPerfilPage = lazy(() => import("./pages/publicPerfil"));
const SobrePage = lazy(() => import("./pages/sobre"));
const MyCollectionPage = lazy(() => import("./pages/myCollection"));
const WishlistPage = lazy(() => import("./pages/wishlist"));
const MyListingsPage = lazy(() => import("./pages/myListings"));
const MyOffersPage = lazy(() => import("./pages/myOffers"));
const SwitchNegociationPage = lazy(() => import("./pages/switchNegociation"));
const UserPerfilPage = lazy(() => import("./pages/userPerfil"));
const NotFoundPage = lazy(() => import("./pages/notFound"));

function App() {
  return (
    <Routes>
      <Route
        element={
          <Suspense fallback={<CarregandoPagina />}>
            <RotaPublicaSo />
          </Suspense>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/cards/:id" element={<CardPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:id" element={<ListingPage />} />
        <Route path="/u/:username" element={<PublicPerfilPage />} />
        <Route path="/sobre" element={<SobrePage />} />

        <Route element={<RotaPrivada />}>
          <Route path="/colecao" element={<MyCollectionPage />} />
          <Route path="/procuro" element={<WishlistPage />} />
          <Route path="/wishlist" element={<Navigate to="/procuro" replace />} />
          <Route path="/anuncios" element={<MyListingsPage />} />
          <Route path="/propostas" element={<MyOffersPage />} />
          <Route path="/trocas" element={<SwitchNegociationPage />} />
          <Route path="/perfil" element={<UserPerfilPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
