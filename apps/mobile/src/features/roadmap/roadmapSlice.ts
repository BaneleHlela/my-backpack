// Direct port of apps/web's features/roadmap/roadmapSlice.ts — same thunks, same state
// shape (currentRoadmap/currentNode/currentLesson), same error-handling convention as this
// app's other slices (extractErrorMessage + builder.addCase chains). currentNode is set only
// via the local setCurrentNode reducer, never fetched over the network — mirrors web exactly,
// where node data comes pre-resolved inside currentRoadmap.nodes[] (see RoadmapWithProgress),
// not a separate GET /roadmap/node/:nodeId call.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type { ApiResponse, RoadmapWithProgress, IRoadmapNode, ILesson } from '@my-backpack/shared';
import api from '../../lib/api';

interface RoadmapState {
  currentRoadmap: RoadmapWithProgress | null;
  currentNode: IRoadmapNode | null;
  currentLesson: ILesson | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RoadmapState = {
  currentRoadmap: null,
  currentNode: null,
  currentLesson: null,
  isLoading: false,
  error: null,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

export const fetchRoadmapByCourse = createAsyncThunk(
  'roadmap/fetchRoadmapByCourse',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<RoadmapWithProgress>>(`/roadmap/course/${courseId}`);
      return res.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch roadmap'));
    }
  }
);

export const fetchLesson = createAsyncThunk(
  'roadmap/fetchLesson',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<{ lesson: ILesson }>>(`/roadmap/lesson/${lessonId}`);
      return res.data.data.lesson;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch lesson'));
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
    },
    clearLesson(state) {
      state.currentLesson = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoadmapByCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoadmapByCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoadmap = action.payload;
      })
      .addCase(fetchRoadmapByCourse.rejected, (state, action) => {
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
      });
  },
});

export const { setCurrentNode, clearRoadmap, clearLesson } = roadmapSlice.actions;
export default roadmapSlice.reducer;
