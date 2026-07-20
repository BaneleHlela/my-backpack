import { Redirect, Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../../src/store/store';

// Mirrors web's LoginPage/SignupPage self-redirect-when-authenticated
// effect, centralised here instead of duplicated per screen.
export default function AuthLayout() {
  const { accessToken, partialToken, isCheckingAuth } = useSelector((state: RootState) => state.auth);

  if (isCheckingAuth) return null;
  if (accessToken) return <Redirect href="/(app)/home" />;
  if (partialToken) return <Redirect href="/select-profile" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
