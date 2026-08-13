import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { getLastRoute } from '../src/lib/secureStore';
import type { RootState } from '../src/store/store';

// Resumes the active profile's last-visited (app) route (see (app)/_layout.tsx's
// RouteTracker) instead of always landing on /home, e.g. after a cold start
// with an already-active profile.
function ResumeRedirect() {
  const router = useRouter();
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);

  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      const lastRoute = activeProfile ? await getLastRoute(activeProfile._id) : null;
      if (!cancelled) router.replace(lastRoute ?? '/(app)/home');
    };
    void go();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, router]);

  return null;
}

// Reuses ProtectedRoute's branching (login / select-profile / profile-setup)
// and only reaches ResumeRedirect once fully authenticated and set up.
export default function Index() {
  return (
    <ProtectedRoute>
      <ResumeRedirect />
    </ProtectedRoute>
  );
}
