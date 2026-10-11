import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * AdminRoute Component
 * Requires both authentication and role === 'admin'.
 * Renders HTTP 403 Forbidden message if authenticated user is not an admin.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  return (
    <ProtectedRoute>
      {loading ? null : user?.role === 'admin' ? (
        children
      ) : (
        <div className="auth-error-card">
          <div className="error-icon">⛔</div>
          <h2>403 Forbidden: Admin Access Required</h2>
          <p>
            You are currently logged in as <strong>{user?.name || user?.email}</strong> with role{' '}
            <span className="badge badge-user">{user?.role || 'user'}</span>.
          </p>
          <p className="error-hint">
            Only administrators are permitted to access this area.
          </p>
          <div className="action-buttons">
            <Link to="/courses" className="btn btn-primary">
              Return to Courses
            </Link>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
