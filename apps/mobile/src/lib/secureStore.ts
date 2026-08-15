// Persistent storage for the refresh token, plus per-profile "last route"
// memory — access/partial tokens stay in Redux memory (short-lived, cheap
// to re-derive via refresh). Guards Platform.OS === 'web' since
// expo-secure-store has no web implementation; not a target platform, just
// a defensive no-op so an `expo start --web` preview during development
// doesn't crash.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'refreshToken';
const LAST_ROUTE_KEY_PREFIX = 'lastRoute_';
const GUEST_NUDGE_KEY_PREFIX = 'guestNudgeShown_';

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

// Remembers the last route a given profile was on within the (app) group
// (roadmap/dictionary browsing screens only — quiz-taking routes live
// outside that group and are deliberately never tracked, since a quiz
// session isn't rehydratable from a route alone). Keyed by profileId so
// each profile on a shared device (Netflix-style profiles) gets its own
// memory, independent of which profile is currently selected.
export async function saveLastRoute(profileId: string, route: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(`${LAST_ROUTE_KEY_PREFIX}${profileId}`, route);
}

export async function getLastRoute(profileId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(`${LAST_ROUTE_KEY_PREFIX}${profileId}`);
}

// Tracks whether a guest profile has already seen the one-time "save your progress" nudge
// (GuestProgressNudge, shown after their first completed quiz session) so it never repeats on
// later sessions. Keyed by profileId, same reasoning as lastRoute above — a shared device could
// hold more than one guest profile in principle.
export async function hasShownGuestNudge(profileId: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const value = await SecureStore.getItemAsync(`${GUEST_NUDGE_KEY_PREFIX}${profileId}`);
  return value === '1';
}

export async function markGuestNudgeShown(profileId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(`${GUEST_NUDGE_KEY_PREFIX}${profileId}`, '1');
}
