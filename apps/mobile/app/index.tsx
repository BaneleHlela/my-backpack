import { Redirect } from 'expo-router';
import { ProtectedRoute } from '../src/components/ProtectedRoute';

// Reuses ProtectedRoute's branching (login / select-profile / profile-setup)
// and only reaches the redirect below once fully authenticated and set up.
export default function Index() {
  return (
    <ProtectedRoute>
      <Redirect href="/(app)/home" />
    </ProtectedRoute>
  );
}
