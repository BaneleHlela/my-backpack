import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createSessionRefresher, type ApiResponse, type RefreshResponse } from '@my-backpack/shared';
import type { AppStore } from '../app/store';
import { logout, setAccessToken } from '../features/auth/authSlice';

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionVersion?: number;
}

let store: AppStore | undefined;
export const injectStore = (appStore: AppStore) => {
  store = appStore;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30000,
});

const session = createSessionRefresher(async () => {
  const auth = store?.getState().auth;
  if (auth?.isSigningOut) throw new axios.CanceledError('Signing out');
  const isCurrent = () => store?.getState().auth.sessionVersion === auth?.sessionVersion
    && store?.getState().auth.accessToken === auth?.accessToken;
  try {
    // Raw axios prevents a failed refresh from recursively refreshing itself.
    const { data } = await axios.post<ApiResponse<RefreshResponse>>(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      { accessToken: auth?.accessToken ?? undefined },
      { withCredentials: true, timeout: 30000 }
    );
    if (!isCurrent()) throw new axios.CanceledError('Session changed');
    store?.dispatch(setAccessToken(data.data.accessToken));
    return data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401 && isCurrent()) {
      store?.dispatch(logout());
    }
    // Offline, timeout, rate-limit and server errors leave the saved login intact.
    throw error;
  }
});

export const refreshSession = session.refresh;
export const finishPendingRefresh = session.settled;

export function noteSessionActivity(): void {
  const auth = store?.getState().auth;
  if (document.visibilityState === 'visible' && auth?.isAuthenticated && !auth.isCheckingAuth && !auth.isSigningOut) {
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
      && auth && !auth.isSigningOut && request._sessionVersion === auth.sessionVersion) {
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
