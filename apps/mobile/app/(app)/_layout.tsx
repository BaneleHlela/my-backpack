import { useEffect } from 'react';
import { Slot, usePathname } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { ScreenBackground } from '../../src/components/ScreenBackground';
import { saveLastRoute } from '../../src/lib/secureStore';
import { fetchEnrolledSubjects } from '../../src/features/content/contentSlice';
import type { AppDispatch, RootState } from '../../src/store/store';

// Persists every route visited inside the (app) group as that profile's
// "last route", so a future cold start / re-login for the same profile can
// resume here instead of always landing on /home — see index.tsx and
// select-profile.tsx for the read side.
function RouteTracker() {
  const pathname = usePathname();
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);

  useEffect(() => {
    if (activeProfile) {
      void saveLastRoute(activeProfile._id, pathname);
    }
  }, [pathname, activeProfile]);

  return null;
}

// A resumed last route can land directly on the Subject or Course screens,
// which (per their own file comments) assume `enrolledSubjects` is already
// in Redux because Home -> Subject -> Course used to be the only navigation
// path into them. Fetching it once as soon as the authenticated area mounts
// (rather than only from home.tsx) makes those screens resolve correctly
// even when entered directly on resume.
function EnsureEnrolledSubjects() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchEnrolledSubjects());
  }, [dispatch]);

  return null;
}

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <ScreenBackground>
        <RouteTracker />
        <EnsureEnrolledSubjects />
        <Slot />
      </ScreenBackground>
    </ProtectedRoute>
  );
}
