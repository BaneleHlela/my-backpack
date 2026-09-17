import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ApiResponse, XpSummary } from '@my-backpack/shared';
import api from '../../lib/api';

interface XpState {
  profileId: string | null;
  summary: XpSummary | null;
  requestId: string | null;
  fetchedAt: number;
  revision: number;
  error: string | null;
}
const initialState: XpState = { profileId: null, summary: null, requestId: null, fetchedAt: 0, revision: 0, error: null };

export const fetchXpSummary = createAsyncThunk<XpSummary, string, { state: { xp: XpState; auth: { activeProfile: { _id: string } | null } } }>(
  'xp/fetchSummary',
  async (profileId) => {
    const response = await api.get<ApiResponse<XpSummary>>('/xp');
    if (response.data.data.profileId !== profileId) throw new Error('Profile changed');
    return response.data.data;
  },
  { condition: (profileId, { getState }) => {
    const { xp, auth } = getState();
    return auth.activeProfile?._id === profileId &&
      (xp.profileId !== profileId || (!xp.requestId && Date.now() - xp.fetchedAt > 15000));
  } }
);

const slice = createSlice({
  name: 'xp', initialState,
  reducers: {},
  extraReducers: (builder) => builder
    .addCase(fetchXpSummary.pending, (state, action) => {
      if (state.profileId !== action.meta.arg) state.summary = null;
      state.profileId = action.meta.arg;
      state.requestId = action.meta.requestId;
      state.error = null;
    })
    .addCase(fetchXpSummary.fulfilled, (state, action) => {
      if (state.requestId !== action.meta.requestId || state.profileId !== action.meta.arg) return;
      state.summary = action.payload;
      state.requestId = null;
      state.fetchedAt = Date.now();
    })
    .addCase(fetchXpSummary.rejected, (state, action) => {
      if (state.requestId !== action.meta.requestId) return;
      state.requestId = null;
      state.error = 'Could not refresh XP. Tap to retry.';
    })
    .addMatcher((action) => ['quiz/completeSession/fulfilled', 'quiz/abandonSession/fulfilled'].includes(action.type),
      (state) => { state.fetchedAt = 0; state.requestId = null; state.revision += 1; })
    .addMatcher((action) => ['auth/selectProfile/pending', 'auth/logout', 'auth/logoutAsync/pending',
      'auth/logoutAsync/fulfilled', 'auth/login/pending', 'auth/continueAsGuest/pending'].includes(action.type),
      () => ({ ...initialState })),
});
export default slice.reducer;
