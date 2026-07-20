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
import StaffRoute from './components/StaffRoute';
import AdminLayout from './admin/AdminLayout';
import StaffLoginPage from './admin/StaffLoginPage';
import AgentInbox from './admin/AgentInbox';
import StaffRequestDetail from './admin/StaffRequestDetail';

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

      {/* Back-office. Its own shell, outside the citizen layout, gated by role.
          The guard is UX only — the API re-checks role and module scope. */}
      <Route path="admin/connexion" element={<StaffLoginPage />} />
      <Route
        path="admin"
        element={
          <StaffRoute>
            <AdminLayout />
          </StaffRoute>
        }
      >
        <Route index element={<AgentInbox />} />
        <Route path="demandes/:id" element={<StaffRequestDetail />} />
      </Route>
    </Routes>
  );
}
