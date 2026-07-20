import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServicesPage from './pages/ServicesPage';
import RequestWizardPage from './pages/RequestWizardPage';
import PaymentPage from './pages/PaymentPage';
import PlaceholderPage from './pages/PlaceholderPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route
          path="espace"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="services" element={<ServicesPage />} />
        <Route
          path="demarche/:code"
          element={
            <ProtectedRoute>
              <RequestWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="paiement/:requestId"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route path="suivi" element={<PlaceholderPage titleKey="nav.tracking" phase="Phase 5" />} />
        <Route path="verifier" element={<PlaceholderPage titleKey="nav.verify" phase="Phase 5" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
