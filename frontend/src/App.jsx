import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServicesPage from './pages/ServicesPage';
import RequestWizardPage from './pages/RequestWizardPage';
import PaymentPage from './pages/PaymentPage';
import NotFoundPage from './pages/NotFoundPage';
import TrackingPage from './pages/TrackingPage';
import RequestTrackingPage from './pages/RequestTrackingPage';
import VerifyPage from './pages/VerifyPage';
import StaffRoute from './components/StaffRoute';
import AdminLayout from './admin/AdminLayout';
import StaffLoginPage from './admin/StaffLoginPage';
import AgentInbox from './admin/AgentInbox';
import StaffRequestDetail from './admin/StaffRequestDetail';
import AdminDashboard from './admin/AdminDashboard';
import StaffManagement from './admin/StaffManagement';
import ServiceManagement from './admin/ServiceManagement';

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
        <Route
          path="suivi"
          element={
            <ProtectedRoute>
              <TrackingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="suivi/:id"
          element={
            <ProtectedRoute>
              <RequestTrackingPage />
            </ProtectedRoute>
          }
        />

        {/* Public on purpose: a QR code is scanned by whoever is handed the
            document, who has no reason to hold an eCivil account. */}
        <Route path="verifier" element={<VerifyPage />} />
        <Route path="verifier/:token" element={<VerifyPage />} />
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

        {/* Running a module is not working requests: AGENTs are excluded here,
            and the API enforces the same split independently. */}
        <Route
          path="tableau"
          element={
            <StaffRoute roles={['ADMIN', 'SUPER_ADMIN']}>
              <AdminDashboard />
            </StaffRoute>
          }
        />
        <Route
          path="personnel"
          element={
            <StaffRoute roles={['ADMIN', 'SUPER_ADMIN']}>
              <StaffManagement />
            </StaffRoute>
          }
        />
        <Route
          path="services"
          element={
            <StaffRoute roles={['ADMIN', 'SUPER_ADMIN']}>
              <ServiceManagement />
            </StaffRoute>
          }
        />
      </Route>
    </Routes>
  );
}
