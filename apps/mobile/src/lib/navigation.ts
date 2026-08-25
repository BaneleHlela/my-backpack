import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

// expo-router's router.back() logs "The action 'GO_BACK' was not handled by any navigator" and
// silently no-ops whenever there's no history entry to go back to. This isn't just a hot-reload
// artifact — it happens for real during normal use, since (app)/_layout.tsx's RouteTracker
// persists the last-visited route and resumes straight onto it on a future cold start/re-login,
// which can land the user directly on a nested screen (e.g. Subject or Course) with nothing
// beneath it on the native stack. Every back button in the app should call this instead of
// `router.back()` directly — it falls back to home (or login, if the session somehow isn't
// authenticated) when there's nowhere left to go back to.
export function useSafeGoBack() {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.accessToken);

  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(isAuthenticated ? '/(app)/home' : '/(auth)/login');
    }
  };
}
