// Port of apps/web's features/quizHistory/quizHistorySlice.ts — a profile's list of past quiz
// attempts (completed or abandoned), filterable by course/topic, plus the per-question review
// for one attempt. Distinct from quizSlice.ts, which owns the *live* quiz-taking session.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type {
  ApiResponse,
  QuizHistoryEntry,
  QuizHistoryFilterOptions,
  QuizHistoryListResult,
  SessionReviewResult,
} from '@my-backpack/shared';
import api from '../../lib/api';

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

export type HistoryStatusFilter = 'all' | 'completed' | 'abandoned';

export interface QuizHistoryFilters {
  contextId?: string;
  nodeId?: string;
  status: HistoryStatusFilter;
}

type FetchStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface QuizHistoryState {
  items: QuizHistoryEntry[];
  total: number;
  page: number;
  limit: number;
  filters: QuizHistoryFilters;
  status: FetchStatus;
  error: string | null;
  filterOptions: QuizHistoryFilterOptions | null;
  filterOptionsStatus: FetchStatus;
  review: SessionReviewResult | null;
  reviewSessionId: string | null;
  reviewStatus: FetchStatus;
  reviewError: string | null;
}

const initialState: QuizHistoryState = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  filters: { status: 'all' },
  status: 'idle',
  error: null,
  filterOptions: null,
  filterOptionsStatus: 'idle',
  review: null,
  reviewSessionId: null,
  reviewStatus: 'idle',
  reviewError: null,
};

export const fetchQuizHistory = createAsyncThunk(
  'quizHistory/fetchQuizHistory',
  async (
    { contextId, nodeId, status, page, limit }: Partial<QuizHistoryFilters> & { page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.get<ApiResponse<QuizHistoryListResult>>('/quiz/history', {
        params: { contextId, nodeId, status, page, limit },
      });
      return res.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load quiz history'));
    }
  }
);

export const fetchHistoryFilterOptions = createAsyncThunk(
  'quizHistory/fetchHistoryFilterOptions',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<QuizHistoryFilterOptions>>('/quiz/history/filters');
      return res.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load filter options'));
    }
  }
);

export const fetchSessionReview = createAsyncThunk(
  'quizHistory/fetchSessionReview',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<SessionReviewResult>>(`/quiz/session/${sessionId}/review`);
      return { sessionId, data: res.data.data };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load quiz review'));
    }
  }
);

const quizHistorySlice = createSlice({
  name: 'quizHistory',
  initialState,
  reducers: {
    setHistoryFilters(state, action: { payload: Partial<QuizHistoryFilters> }) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    setHistoryPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
    resetReview(state) {
      state.review = null;
      state.reviewSessionId = null;
      state.reviewStatus = 'idle';
      state.reviewError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuizHistory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQuizHistory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchQuizHistory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchHistoryFilterOptions.pending, (state) => {
        state.filterOptionsStatus = 'loading';
      })
      .addCase(fetchHistoryFilterOptions.fulfilled, (state, action) => {
        state.filterOptionsStatus = 'succeeded';
        state.filterOptions = action.payload;
      })
      .addCase(fetchHistoryFilterOptions.rejected, (state) => {
        state.filterOptionsStatus = 'failed';
      })
      .addCase(fetchSessionReview.pending, (state) => {
        state.reviewStatus = 'loading';
        state.reviewError = null;
      })
      .addCase(fetchSessionReview.fulfilled, (state, action) => {
        state.reviewStatus = 'succeeded';
        state.reviewSessionId = action.payload.sessionId;
        state.review = action.payload.data;
      })
      .addCase(fetchSessionReview.rejected, (state, action) => {
        state.reviewStatus = 'failed';
        state.reviewError = action.payload as string;
      });
  },
});

export const { setHistoryFilters, setHistoryPage, resetReview } = quizHistorySlice.actions;
export default quizHistorySlice.reducer;
