import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

interface ProtectedRouteProps {
  children: ReactNode;
  requireFullToken?: boolean;
}

export default function ProtectedRoute({ children, requireFullToken = true }: ProtectedRouteProps) {
  const { accessToken, partialToken, isCheckingAuth } = useSelector(
    (state: RootState) => state.auth
  );

  if (isCheckingAuth) return null;

  if (requireFullToken) {
    if (!partialToken && !accessToken) return <Navigate to="/login" replace />;
    if (partialToken && !accessToken) return <Navigate to="/select-profile" replace />;
    return <>{children}</>;
  }

  // select-profile guard: requires partial token, redirects away if already fully authenticated
  if (!partialToken && !accessToken) return <Navigate to="/login" replace />;
  if (accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}
