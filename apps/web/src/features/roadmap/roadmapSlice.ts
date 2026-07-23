import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../lib/axios';
import type { RoadmapWithProgress, IRoadmapNode, ILesson } from '@my-backpack/shared';

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

export const fetchRoadmapByCourse = createAsyncThunk(
  'roadmap/fetchRoadmapByCourse',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/roadmap/course/${courseId}`);
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

export const { setCurrentNode, clearRoadmap } = roadmapSlice.actions;
export default roadmapSlice.reducer;
