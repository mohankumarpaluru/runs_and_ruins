import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

// ─── PrivateRoute: requires any logged-in user ─────────────────
export function PrivateRoute({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Thin splash while session rehydrates
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#080E1A' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: '#00D4C8',
            borderRightColor: 'rgba(0,212,200,0.2)',
          }}
        />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ─── AdminRoute: requires role === 'admin' ─────────────────────
export function AdminRoute({ children }: { children: ReactNode }) {
  const { currentUser, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#080E1A' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: '#00D4C8',
            borderRightColor: 'rgba(0,212,200,0.2)',
          }}
        />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Redirect non-admins back to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
