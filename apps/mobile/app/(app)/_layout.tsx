import { Slot } from 'expo-router';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { ScreenBackground } from '../../src/components/ScreenBackground';

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <ScreenBackground>
        <Slot />
      </ScreenBackground>
    </ProtectedRoute>
  );
}
