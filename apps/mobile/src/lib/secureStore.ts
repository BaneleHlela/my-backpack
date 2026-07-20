// Persistent storage for the refresh token only — access/partial tokens
// stay in Redux memory (short-lived, cheap to re-derive via refresh).
// Guards Platform.OS === 'web' since expo-secure-store has no web
// implementation; not a target platform, just a defensive no-op so an
// `expo start --web` preview during development doesn't crash.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'refreshToken';

export async function saveRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
