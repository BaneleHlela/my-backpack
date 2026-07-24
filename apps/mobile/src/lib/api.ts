// Mirrors apps/web's lib/axios.ts interceptor pattern, adapted for
// token-in-body refresh instead of cookies (native has no persistent
// cookie jar — see docs/technical/mobile-architecture.md).
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AppStore } from '../store/store';
import { logout, setAccessToken } from '../features/auth/authSlice';

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let store: AppStore | undefined;

export const injectStore = (appStore: AppStore) => {
  store = appStore;
};

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'X-Client-Type': 'mobile' },
  timeout: 30000, // Render free-tier cold starts can take ~30s; without this a hung
  // request leaves callers' isLoading stuck true forever with no way to recover.
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authState = store?.getState().auth;
  const token = authState?.accessToken || authState?.partialToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = store?.getState().auth.refreshToken;

      if (refreshToken) {
        try {
          const { data } = await axios.post<{ success: boolean; data: { accessToken: string } }>(
            `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken },
            { headers: { 'X-Client-Type': 'mobile' } }
          );
          const newToken = data.data.accessToken;
          store?.dispatch(setAccessToken(newToken));
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch {
          store?.dispatch(logout());
        }
      } else {
        store?.dispatch(logout());
      }
    }

    return Promise.reject(error);
  }
);

export default api;
