import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

/**
 * Citizen-area gate. Client-side and for UX only — it hides screens, it does not
 * protect data. Every protected resource is authorized server-side on each request.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isStaff } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  // A staff session cannot act as a citizen: the API would reject these calls
  // anyway, so send them somewhere that works instead of into a wall of 403s.
  if (isStaff) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
