// Ports apps/web's components/ProtectedRoute.tsx branching logic exactly,
// using Expo Router's <Redirect> in place of React Router's <Navigate>.
import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

interface ProtectedRouteProps {
  children: ReactNode;
  requireFullToken?: boolean;
  allowIncompleteProfile?: boolean;
}

export function ProtectedRoute({
  children,
  requireFullToken = true,
  allowIncompleteProfile = false,
}: ProtectedRouteProps) {
  const { accessToken, partialToken, isCheckingAuth, isLoadingProfile, activeProfile } = useSelector(
    (state: RootState) => state.auth
  );

  if (isCheckingAuth) return null;

  if (requireFullToken) {
    if (!partialToken && !accessToken) return <Redirect href="/(auth)/login" />;
    if (partialToken && !accessToken) return <Redirect href="/select-profile" />;
    if (isLoadingProfile) return null;
    if (!allowIncompleteProfile && accessToken && activeProfile && !activeProfile.isSetupComplete) {
      return <Redirect href="/profile-setup" />;
    }
    return <>{children}</>;
  }

  // select-profile guard: requires partial token, redirects away if already fully authenticated
  if (!partialToken && !accessToken) return <Redirect href="/(auth)/login" />;
  if (accessToken) return <Redirect href="/(app)/home" />;
  return <>{children}</>;
}
