// Combines apps/web's enrollmentSlice.ts (fetchEnrolledSubjects,
// fetchAvailableSubjects, enrollInSubject) and roadmapSlice.ts's
// fetchSubjectTopics thunk into one slice, since this mobile build only
// needs enough content navigation to reach a standalone mini-app — no
// roadmap rendering (see docs/technical/mobile-architecture.md).
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type {
  ApiResponse,
  EnrolledSubjectsResponse,
  AvailableSubject,
  ITopic,
  IMiniApp,
} from '@my-backpack/shared';
import api from '../../lib/api';

export interface StandaloneTopicEntry {
  topic: ITopic;
  miniApps: IMiniApp[];
}

interface ContentState {
  enrolledSubjects: EnrolledSubjectsResponse | null;
  availableSubjects: AvailableSubject[];
  standaloneTopicsBySubject: Record<string, StandaloneTopicEntry[]>;
  isLoading: boolean;
  isLoadingAvailable: boolean;
  isEnrolling: boolean;
  error: string | null;
}

const initialState: ContentState = {
  enrolledSubjects: null,
  availableSubjects: [],
  standaloneTopicsBySubject: {},
  isLoading: false,
  isLoadingAvailable: false,
  isEnrolling: false,
  error: null,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

export const fetchEnrolledSubjects = createAsyncThunk(
  'content/fetchEnrolledSubjects',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiResponse<EnrolledSubjectsResponse>>('/enrollment/subjects');
      return data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch enrolled subjects'));
    }
  }
);

export const fetchAvailableSubjects = createAsyncThunk(
  'content/fetchAvailableSubjects',
  async (fieldSlug: string | undefined, { rejectWithValue }) => {
    try {
      const params = fieldSlug ? `?fieldSlug=${fieldSlug}` : '';
      const { data } = await api.get<ApiResponse<{ subjects: AvailableSubject[] }>>(
        `/enrollment/subjects/available${params}`
      );
      return data.data.subjects;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch available subjects'));
    }
  }
);

export const enrollInSubject = createAsyncThunk(
  'content/enrollInSubject',
  async (subjectId: string, { rejectWithValue }) => {
    try {
      await api.post('/enrollment/subjects', { subjectId });
      return subjectId;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to enroll in subject'));
    }
  }
);

// Mirrors apps/web's roadmapSlice.fetchSubjectTopics: fetch a subject's
// topics, then each topic's mini-apps, keeping only topics with at least
// one non-roadmap mini-app (roadmap UI is out of scope for this build).
export const fetchStandaloneMiniApps = createAsyncThunk(
  'content/fetchStandaloneMiniApps',
  async (
    { fieldSlug, subjectSlug, subjectId }: { fieldSlug: string; subjectSlug: string; subjectId: string },
    { rejectWithValue }
  ) => {
    try {
      const topicsRes = await api.get<ApiResponse<ITopic[]>>(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/topics`
      );

      const entries: StandaloneTopicEntry[] = await Promise.all(
        topicsRes.data.data.map(async (topic) => {
          const miniAppsRes = await api.get<ApiResponse<IMiniApp[]>>(
            `/content/fields/${fieldSlug}/subjects/${subjectSlug}/topics/${topic.slug}/miniapps`
          );
          return { topic, miniApps: miniAppsRes.data.data };
        })
      );

      const standaloneOnly = entries.filter((e) => e.miniApps.some((m) => m.type !== 'roadmap'));
      return { subjectId, entries: standaloneOnly };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch subject topics'));
    }
  }
);

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    clearContentError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnrolledSubjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEnrolledSubjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrolledSubjects = action.payload;
      })
      .addCase(fetchEnrolledSubjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAvailableSubjects.pending, (state) => {
        state.isLoadingAvailable = true;
      })
      .addCase(fetchAvailableSubjects.fulfilled, (state, action) => {
        state.isLoadingAvailable = false;
        state.availableSubjects = action.payload;
      })
      .addCase(fetchAvailableSubjects.rejected, (state, action) => {
        state.isLoadingAvailable = false;
        state.error = action.payload as string;
      })
      .addCase(enrollInSubject.pending, (state) => {
        state.isEnrolling = true;
      })
      .addCase(enrollInSubject.fulfilled, (state) => {
        state.isEnrolling = false;
      })
      .addCase(enrollInSubject.rejected, (state, action) => {
        state.isEnrolling = false;
        state.error = action.payload as string;
      })
      .addCase(fetchStandaloneMiniApps.fulfilled, (state, action) => {
        state.standaloneTopicsBySubject[action.payload.subjectId] = action.payload.entries;
      });
  },
});

export const { clearContentError } = contentSlice.actions;
export default contentSlice.reducer;
