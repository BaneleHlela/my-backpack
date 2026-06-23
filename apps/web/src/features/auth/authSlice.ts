import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { IAccount, ProfileSummary, LoginResponse, RegisterResponse, SelectProfileResponse } from '@my-backpack/shared';
import type { AxiosError } from 'axios';
import axios from 'axios';
import api from '../../lib/axios';

interface AuthState {
  account: IAccount | null;
  profiles: ProfileSummary[];
  activeProfile: ProfileSummary | null;
  partialToken: string | null;
  accessToken: string | null;
  isLoading: boolean;
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
  isLoading: false,
  error: null,
  successMessage: null,
  isCheckingAuth: true,
  isAuthenticated: false,
};

interface RefreshResponse {
  accessToken?: string;
  partialToken?: string;
}

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
  state.isAuthenticated = false;
  state.error = null;
  state.successMessage = null;
  state.isLoading = false;
}

// --- Async thunks ---

export const checkAuth = createAsyncThunk<RefreshResponse>('auth/checkAuth', async () => {
  const { data } = await axios.post<RefreshResponse>(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );
  return data;
});


export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
      return data;
    } catch (error) {
      const axiosError = error as import('axios').AxiosError<{ message?: string; needsVerification?: boolean; email?: string }>;
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
      const { data } = await api.post<RegisterResponse>('/auth/register', {
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
      const { data } = await api.post<SelectProfileResponse>('/auth/select-profile', { profileId, pin });
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
  }
});

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      await api.post('/auth/forgot-password', { email });
      return 'If an account with that email exists, a reset link has been sent.';
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to send reset email'));
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      return 'Password reset successfully. You can now sign in.';
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to reset password'));
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ token }: { token: string }, { rejectWithValue }) => {
    try {
      await api.post('/auth/verify-email', { token });
      return 'Your email has been verified successfully!';
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Email verification failed'));
    }
  }
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      await api.post('/auth/resend-verification', { email });
      return 'Verification email sent. Please check your inbox.';
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to resend verification email'));
    }
  }
);

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
    setActiveProfile(state, action: PayloadAction<ProfileSummary | null>) {
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
      // checkAuth
      .addCase(checkAuth.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        if (action.payload.accessToken) {
          state.accessToken = action.payload.accessToken;
          state.isAuthenticated = true;
        } else if (action.payload.partialToken) {
          state.partialToken = action.payload.partialToken;
        }
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isCheckingAuth = false;
      })
      // login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.partialToken = action.payload.partialToken;
        state.profiles = action.payload.profiles;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as string | { needsVerification: true; email: string };
        if (typeof payload === 'object' && payload?.needsVerification) {
          // navigation to /verify-email is handled by LoginPage
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
        // User must verify email before getting access — navigation handled by SignupPage
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
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.partialToken = null;
        const profile = state.profiles.find((p) => p.id === action.meta.arg.profileId);
        if (profile) state.activeProfile = profile;
      })
      .addCase(selectProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // logoutAsync
      .addCase(logoutAsync.fulfilled, resetState)
      .addCase(logoutAsync.rejected, resetState)
      // forgotPassword
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.successMessage = action.payload;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // resetPassword
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.successMessage = action.payload;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // verifyEmail
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.successMessage = action.payload;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // resendVerification — state managed locally in VerifyEmailPage
      .addCase(resendVerification.pending, () => {})
      .addCase(resendVerification.fulfilled, () => {})
      .addCase(resendVerification.rejected, () => {});
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
