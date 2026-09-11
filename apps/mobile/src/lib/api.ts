import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createSessionRefresher, type ApiResponse, type RefreshResponse } from '@my-backpack/shared';
import { AppState } from 'react-native';
import type { AppStore } from '../store/store';
import { logout, setSessionTokens } from '../features/auth/authSlice';
import { saveRefreshToken, deleteRefreshToken } from './secureStore';

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionVersion?: number;
}

let store: AppStore | undefined;
export const injectStore = (appStore: AppStore) => {
  store = appStore;
};
console.log(process.env.EXPO_PUBLIC_API_URL);
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'X-Client-Type': 'mobile' },
  timeout: 30000, // Allow for Render cold starts while keeping failures retryable.
});

const session = createSessionRefresher(async () => {
  const auth = store?.getState().auth;
  if (!auth?.refreshToken) throw new axios.CanceledError('No saved session');
  if (auth.isSigningOut) throw new axios.CanceledError('Signing out');
  const isCurrent = () => store?.getState().auth.sessionVersion === auth.sessionVersion
    && store?.getState().auth.accessToken === auth.accessToken;
  try {
    // Raw axios prevents a failed refresh from recursively refreshing itself.
    const { data } = await axios.post<ApiResponse<RefreshResponse>>(
      `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
      { refreshToken: auth.refreshToken, accessToken: auth.accessToken ?? undefined },
      { headers: { 'X-Client-Type': 'mobile' }, timeout: 30000 }
    );
    if (!isCurrent()) throw new axios.CanceledError('Session changed');
    // Retain compatibility while the new API is being rolled out.
    const tokens = { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken ?? auth.refreshToken };
    await saveRefreshToken(tokens.refreshToken);
    if (!isCurrent()) throw new axios.CanceledError('Session changed');
    store?.dispatch(setSessionTokens(tokens));
    return tokens;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401 && isCurrent()) {
      store?.dispatch(logout());
      await deleteRefreshToken();
    }
    // Offline, timeout, rate-limit and server errors leave the saved login intact.
    throw error;
  }
});

export const refreshSession = session.refresh;
export const finishPendingRefresh = session.settled;

export function noteSessionActivity(): void {
  const auth = store?.getState().auth;
  if (AppState.currentState === 'active' && auth?.isAuthenticated && !auth.isCheckingAuth && !auth.isSigningOut) {
    session.activity();
  }
}

const publicAuthRequest = (url?: string) =>
  /\/auth\/(login|register|guest|refresh|logout|forgot-password|reset-password|verify-email|resend-verification)(?:\?|$)/.test(url ?? '');

api.interceptors.request.use((config: RetryableRequest) => {
  const auth = store?.getState().auth;
  const token = auth?.accessToken || auth?.partialToken;
  config._sessionVersion = auth?.sessionVersion;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (!publicAuthRequest(config.url)) noteSessionActivity();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;
    const auth = store?.getState().auth;
    if (error.response?.status === 401 && request && !request._retry
      && !publicAuthRequest(request.url) && request.headers.Authorization
      && auth?.refreshToken && !auth.isSigningOut && request._sessionVersion === auth.sessionVersion) {
      request._retry = true;
      // A concurrent request may already have renewed the token before this 401.
      const currentToken = auth.accessToken;
      const token = currentToken && request.headers.Authorization !== `Bearer ${currentToken}`
        ? currentToken : (await refreshSession()).accessToken;
      if (store?.getState().auth.sessionVersion !== request._sessionVersion) {
        throw new axios.CanceledError('Session changed');
      }
      request.headers.Authorization = `Bearer ${token}`;
      return api(request);
    }
    return Promise.reject(error);
  }
);

export default api;
