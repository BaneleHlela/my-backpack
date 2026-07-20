// Mirrors apps/web's features/auth/authSlice.ts state shape and thunks
// exactly, with two differences: no cookie-based checkAuth (replaced by
// bootstrapAuth, which reads the refresh token from SecureStore instead of
// relying on a cookie the OS sends automatically), and login/logout also
// persist/clear the refresh token in SecureStore. Only the six thunks this
// mobile build actually uses are ported (login, register, selectProfile,
// logoutAsync, fetchActiveProfile, completeProfileSetup) — forgotPassword/
// resetPassword/verifyEmail/resendVerification have no mobile screen yet
// (see docs/technical/mobile-architecture.md) so aren't ported until one
// exists.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  IAccount,
  ProfileSummary,
  LoginResponse,
  RegisterResponse,
  SelectProfileResponse,
  ApiResponse,
  IProfile,
  ProfileSetupDto,
} from '@my-backpack/shared';
import type { AxiosError } from 'axios';
import api from '../../lib/api';
import { getRefreshToken, saveRefreshToken, deleteRefreshToken } from '../../lib/secureStore';

interface AuthState {
  account: IAccount | null;
  profiles: ProfileSummary[];
  activeProfile: IProfile | null;
  partialToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isLoadingProfile: boolean;
  error: string | null;
  successMessage: string | null;
  isCheckingAuth: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  account: null,
  profiles: [],
  activeProfile: null,
  partialToken: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isLoadingProfile: false,
  error: null,
  successMessage: null,
  isCheckingAuth: true,
  isAuthenticated: false,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? (error instanceof Error ? error.message : fallback);
}

function resetState(state: AuthState) {
  state.account = null;
  state.profiles = [];
  state.activeProfile = null;
  state.partialToken = null;
  state.accessToken = null;
  state.refreshToken = null;
  state.isAuthenticated = false;
  state.error = null;
  state.successMessage = null;
  state.isLoading = false;
  state.isLoadingProfile = false;
}

// --- Async thunks ---

// Replaces web's cookie-based checkAuth — native has no persistent cookie
// jar, so the refresh token is read back out of SecureStore explicitly.
export const bootstrapAuth = createAsyncThunk('auth/bootstrapAuth', async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return { authenticated: false as const };
  }

  try {
    const { data } = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', { refreshToken });
    return { authenticated: true as const, accessToken: data.data.accessToken, refreshToken };
  } catch {
    await deleteRefreshToken();
    return { authenticated: false as const };
  }
});

export const fetchActiveProfile = createAsyncThunk(
  'auth/fetchActiveProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiResponse<IProfile>>('/profiles/me');
      return data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load profile'));
    }
  }
);

export const completeProfileSetup = createAsyncThunk(
  'auth/completeProfileSetup',
  async (payload: ProfileSetupDto, { rejectWithValue }) => {
    try {
      const { data } = await api.patch<ApiResponse<IProfile>>('/profiles/me/setup', payload);
      return data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Setup failed'));
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
      if (data.data.refreshToken) {
        await saveRefreshToken(data.data.refreshToken);
      }
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; needsVerification?: boolean; email?: string }>;
      if (axiosError?.response?.status === 403 && axiosError.response.data?.needsVerification) {
        return rejectWithValue({ needsVerification: true, email: axiosError.response.data.email ?? '' });
      }
      return rejectWithValue(extractErrorMessage(error, 'Login failed'));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { email, password, displayName }: { email: string; password: string; displayName: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post<ApiResponse<RegisterResponse>>('/auth/register', {
        email,
        password,
        displayName,
        ageGroup: 'adult',
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Registration failed'));
    }
  }
);

export const selectProfile = createAsyncThunk(
  'auth/selectProfile',
  async ({ profileId, pin }: { profileId: string; pin?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiResponse<SelectProfileResponse>>('/auth/select-profile', { profileId, pin });
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to select profile'));
    }
  }
);

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Clear local state regardless of API response
  } finally {
    await deleteRefreshToken();
  }
});

// --- Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccount(state, action: PayloadAction<IAccount | null>) {
      state.account = action.payload;
    },
    setProfiles(state, action: PayloadAction<ProfileSummary[]>) {
      state.profiles = action.payload;
    },
    setActiveProfile(state, action: PayloadAction<IProfile | null>) {
      state.activeProfile = action.payload;
    },
    setPartialToken(state, action: PayloadAction<string | null>) {
      state.partialToken = action.payload;
    },
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
      state.successMessage = null;
    },
    logout: resetState,
  },
  extraReducers: (builder) => {
    builder
      // bootstrapAuth
      .addCase(bootstrapAuth.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        if (action.payload.authenticated) {
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.isCheckingAuth = false;
      })
      // fetchActiveProfile
      .addCase(fetchActiveProfile.pending, (state) => {
        state.isLoadingProfile = true;
      })
      .addCase(fetchActiveProfile.fulfilled, (state, action) => {
        state.isLoadingProfile = false;
        state.activeProfile = action.payload;
      })
      .addCase(fetchActiveProfile.rejected, (state) => {
        state.isLoadingProfile = false;
      })
      // completeProfileSetup
      .addCase(completeProfileSetup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeProfileSetup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeProfile = action.payload;
      })
      .addCase(completeProfileSetup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.partialToken = action.payload.data.partialToken;
        state.profiles = action.payload.data.profiles;
        state.refreshToken = action.payload.data.refreshToken ?? state.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as string | { needsVerification: true; email: string };
        if (typeof payload === 'object' && payload?.needsVerification) {
          // navigation to /verify-email is handled by the login screen
        } else {
          state.error = payload as string;
        }
      })
      // register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        // User must verify email before getting access — navigation handled by the signup screen
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // selectProfile
      .addCase(selectProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(selectProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.data.accessToken;
        state.isAuthenticated = true;
        state.partialToken = null;
      })
      .addCase(selectProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // logoutAsync
      .addCase(logoutAsync.fulfilled, resetState)
      .addCase(logoutAsync.rejected, resetState);
  },
});

export const {
  setAccount,
  setProfiles,
  setActiveProfile,
  setPartialToken,
  setAccessToken,
  setIsLoading,
  setError,
  clearError,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
