import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

/**
 * Back-office gate. Like ProtectedRoute, this is UX only: the API re-checks role
 * and module scope on every staff route. A citizen who guesses /admin sees the
 * staff login, not the inbox.
 *
 * `roles` optionally narrows further, e.g. <StaffRoute roles={['SUPER_ADMIN']}>.
 */
export default function StaffRoute({ children, roles }) {
  const { isAuthenticated, isStaff, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !isStaff) {
    return <Navigate to="/admin/connexion" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
