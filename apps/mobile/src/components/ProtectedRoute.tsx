// Ports apps/web's components/ProtectedRoute.tsx branching logic exactly,
// using Expo Router's <Redirect> in place of React Router's <Navigate>.
import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { LaunchScreen } from './LaunchScreen';

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

  // Both blocking states below render <LaunchScreen/> (logo + spinner) rather than null,
  // so every "waiting on auth state" moment looks the same as the app's cold-start launch
  // screen instead of flashing blank. isCheckingAuth is normally already handled at the root
  // layout (app/_layout.tsx swaps in <LaunchScreen/> before this component ever mounts) — kept
  // here too since ProtectedRoute is reused standalone on several routes (see index.tsx).
  if (isCheckingAuth) return <LaunchScreen />;

  if (requireFullToken) {
    if (!partialToken && !accessToken) return <Redirect href="/(auth)/login" />;
    if (partialToken && !accessToken) return <Redirect href="/select-profile" />;
    if (isLoadingProfile) return <LaunchScreen />;
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
