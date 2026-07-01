import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CharacterCreatorPage from './pages/CharacterCreatorPage';
import MainLayout from './layouts/MainLayout';
import CasinoPage from './pages/CasinoPage';
import RankedPage from './pages/RankedPage';
import ShopPage from './pages/ShopPage';
import WorkPage from './pages/WorkPage';
import RankingPage from './pages/RankingPage';
import EntertainmentPage from './pages/EntertainmentPage';
import PlockEventPage from './pages/PlockEventPage';
import BusinessEmpirePage from './pages/BusinessEmpirePage';
import StockMarketPage from './pages/StockMarketPage';
import HousePage from './pages/HousePage';
import { useAuthStore } from './stores/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/game/kasyno" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route 
        path="/character" 
        element={
          <ProtectedRoute>
            <CharacterCreatorPage />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/game" 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="kasyno" element={<CasinoPage />} />
        <Route path="rywalizacja" element={<RankedPage />} />
        <Route path="rozrywka" element={<EntertainmentPage />} />
        <Route path="sklep" element={<ShopPage />} />
        <Route path="dom" element={<HousePage />} />
        <Route path="praca" element={<WorkPage />} />
        <Route path="biznes" element={<BusinessEmpirePage />} />
        <Route path="gielda" element={<StockMarketPage />} />
        <Route path="plock" element={<PlockEventPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="*" element={<Navigate to="kasyno" replace />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
