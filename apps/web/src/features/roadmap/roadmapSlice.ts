import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../lib/axios';
import type {
  RoadmapWithProgress,
  IRoadmapNode,
  ILesson,
  ITopic,
  IMiniApp,
} from '@my-backpack/shared';

export interface StandaloneTopicEntry {
  topic: ITopic;
  miniApps: IMiniApp[];
}

interface RoadmapState {
  currentRoadmap: RoadmapWithProgress | null;
  currentNode: IRoadmapNode | null;
  currentLesson: ILesson | null;
  standaloneTopics: StandaloneTopicEntry[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RoadmapState = {
  currentRoadmap: null,
  currentNode: null,
  currentLesson: null,
  standaloneTopics: [],
  isLoading: false,
  error: null,
};

export const fetchRoadmapBySubject = createAsyncThunk(
  'roadmap/fetchBySubject',
  async (subjectId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/roadmap/subject/${subjectId}`);
      return res.data.data as RoadmapWithProgress;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch roadmap');
    }
  }
);

export const fetchRoadmapByMiniApp = createAsyncThunk(
  'roadmap/fetchByMiniApp',
  async (miniAppId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/roadmap/${miniAppId}`);
      return res.data.data as RoadmapWithProgress;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch roadmap');
    }
  }
);

export const fetchLesson = createAsyncThunk(
  'roadmap/fetchLesson',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/roadmap/lesson/${lessonId}`);
      // API returns { lesson, progress, isUnlocked } — extract just the lesson.
      return (res.data.data.lesson ?? res.data.data) as ILesson;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch lesson');
    }
  }
);

export const fetchSubjectTopics = createAsyncThunk(
  'roadmap/fetchSubjectTopics',
  async (
    { fieldSlug, subjectSlug }: { fieldSlug: string; subjectSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const topicsRes = await axiosInstance.get(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/topics`
      );
      const topics = topicsRes.data.data as ITopic[];

      const entries: StandaloneTopicEntry[] = await Promise.all(
        topics.map(async (topic) => {
          const miniAppsRes = await axiosInstance.get(
            `/content/fields/${fieldSlug}/subjects/${subjectSlug}/topics/${topic.slug}/miniapps`
          );
          return { topic, miniApps: miniAppsRes.data.data as IMiniApp[] };
        })
      );

      // Return topics that have at least one non-roadmap mini app
      return entries.filter((e) => e.miniApps.some((m) => m.type !== 'roadmap'));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch topics');
    }
  }
);

const roadmapSlice = createSlice({
  name: 'roadmap',
  initialState,
  reducers: {
    setCurrentNode(state, action: PayloadAction<IRoadmapNode | null>) {
      state.currentNode = action.payload;
    },
    clearRoadmap(state) {
      state.currentRoadmap = null;
      state.currentNode = null;
      state.currentLesson = null;
      state.standaloneTopics = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoadmapBySubject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoadmapBySubject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoadmap = action.payload;
      })
      .addCase(fetchRoadmapBySubject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRoadmapByMiniApp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoadmapByMiniApp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoadmap = action.payload;
      })
      .addCase(fetchRoadmapByMiniApp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchLesson.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLesson.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentLesson = action.payload;
      })
      .addCase(fetchLesson.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSubjectTopics.fulfilled, (state, action) => {
        state.standaloneTopics = action.payload;
      });
  },
});

export const { setCurrentNode, clearRoadmap } = roadmapSlice.actions;
export default roadmapSlice.reducer;
