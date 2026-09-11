// Mirrors apps/web's features/auth/authSlice.ts state shape and thunks
// exactly, with two differences: no cookie-based checkAuth (replaced by
// bootstrapAuth, which reads the refresh token from SecureStore instead of
// relying on a cookie the OS sends automatically), and login/logout also
// persist/clear the refresh token in SecureStore. Only the six thunks this
// mobile build actually uses are ported (login, register, selectProfile,
// logoutAsync, fetchActiveProfile, completeProfileSetup) — forgotPassword/
// resetPassword/verifyEmail/resendVerification have no mobile screen yet
// (see docs/technical/mobile-architecture.md) so aren't ported until one
// exists. Guest mode (August 2026, see docs/technical/guest-mode.md) added
// two more: continueAsGuest and claimAccount — web has no guest mode yet,
// so these are mobile-only, not ports of anything on web.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  IAccount,
  ProfileSummary,
  LoginResponse,
  RegisterResponse,
  SelectProfileResponse,
  GuestSignupResponse,
  ClaimAccountResponse,
  ApiResponse,
  IProfile,
  AgeGroup,
  ProfileSetupDto,
} from '@my-backpack/shared';
import type { AxiosError } from 'axios';
import axios from 'axios';
import api, { refreshSession, finishPendingRefresh } from '../../lib/api';
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
  sessionVersion: number;
  isSigningOut: boolean;
  bootstrapError: string | null;
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
  sessionVersion: 0,
  isSigningOut: false,
  bootstrapError: null,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? (error instanceof Error ? error.message : fallback);
}

function resetState(state: AuthState) {
  state.sessionVersion += 1;
  state.isSigningOut = false;
  state.bootstrapError = null;
  state.isCheckingAuth = false;
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
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;
      dispatch(setRefreshToken(refreshToken));
      // Saves the renewed token and commits both tokens before profile requests.
      await refreshSession();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return false;
      if (axios.isCancel(error)) return false;
      return rejectWithValue('Unable to reconnect. Check your connection and try again.');
    }
    await Promise.all([dispatch(fetchActiveProfile()), dispatch(fetchProfiles())]);
    return true;
  }
);

// GET /profiles — the account's full profile list (ProfileSummary[]), same shape login's
// response already carries. Only ever previously populated by login.fulfilled, which a
// bootstrap-resumed session (no login screen involved) never runs — see bootstrapAuth above.
export const fetchProfiles = createAsyncThunk(
  'auth/fetchProfiles',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiResponse<ProfileSummary[]>>('/profiles');
      return data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load profiles'));
    }
  }
);

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

// POST /api/auth/guest — skips the partial-token/select-profile round trip entirely (there's
// exactly one profile, nothing to verify). The response's `profile` is only ProfileSummary-
// shaped (not the full IProfile activeProfile needs — no accountId/education/preferences/
// progress), so this thunk only sets the token half of the session; the caller (Login screen)
// dispatches fetchActiveProfile() right after, same two-step pattern already used by
// ProfileSwitcherModal's/select-profile.tsx's doSelectAndNavigate.
export const continueAsGuest = createAsyncThunk(
  'auth/continueAsGuest',
  async (payload: { displayName?: string; ageGroup?: AgeGroup } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiResponse<GuestSignupResponse>>('/auth/guest', payload ?? {});
      if (data.data.refreshToken) {
        await saveRefreshToken(data.data.refreshToken);
      }
      return data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to continue as guest'));
    }
  }
);

// POST /api/auth/claim — adds email/password credentials to the guest account already in use.
// No logout/re-login: the caller keeps its current session, this just flips isGuest off locally
// once the server confirms it.
export const claimAccount = createAsyncThunk(
  'auth/claimAccount',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiResponse<ClaimAccountResponse>>('/auth/claim', { email, password });
      return data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to save progress'));
    }
  }
);

export const logoutAsync = createAsyncThunk('auth/logoutAsync', async () => {
  try {
    await finishPendingRefresh();
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
    setRefreshToken(state, action: PayloadAction<string>) {
      state.refreshToken = action.payload;
    },
    setSessionTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
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
        state.bootstrapError = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state) => {
        state.isCheckingAuth = false;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        state.isCheckingAuth = false;
        state.bootstrapError = action.payload as string;
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
      // fetchProfiles
      .addCase(fetchProfiles.fulfilled, (state, action) => {
        state.profiles = action.payload;
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
        resetState(state);
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
      // continueAsGuest
      .addCase(continueAsGuest.pending, (state) => {
        resetState(state);
        state.isLoading = true;
        state.error = null;
      })
      .addCase(continueAsGuest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken ?? null;
        state.isAuthenticated = true;
        state.partialToken = null;
      })
      .addCase(continueAsGuest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // claimAccount
      .addCase(claimAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(claimAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.activeProfile) {
          state.activeProfile = { ...state.activeProfile, isGuest: false };
        }
        state.successMessage = `Progress saved! A verification link was sent to ${action.payload.email}.`;
      })
      .addCase(claimAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // logoutAsync
      .addCase(logoutAsync.pending, (state) => {
        // Invalidate pending refreshes immediately, but finish clearing the server
        // cookie before exposing the login screen to a new sign-in.
        state.sessionVersion += 1;
        state.isSigningOut = true;
      })
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
  setRefreshToken,
  setSessionTokens,
  setIsLoading,
  setError,
  clearError,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
