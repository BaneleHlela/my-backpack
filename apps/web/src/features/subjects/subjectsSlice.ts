import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../lib/axios';
import type { ISubject, IMiniApp } from '@my-backpack/shared';

interface SubjectsState {
  subjectsByKey: Record<string, ISubject>;
  miniAppsByKey: Record<string, IMiniApp[]>;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubjectsState = {
  subjectsByKey: {},
  miniAppsByKey: {},
  isLoading: false,
  error: null,
};

function subjectKey(fieldSlug: string, subjectSlug: string): string {
  return `${fieldSlug}/${subjectSlug}`;
}

export const fetchSubjectBySlug = createAsyncThunk(
  'subjects/fetchSubjectBySlug',
  async (
    { fieldSlug, subjectSlug }: { fieldSlug: string; subjectSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get(`/content/fields/${fieldSlug}/subjects/${subjectSlug}`);
      return res.data.data as ISubject;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch subject');
    }
  }
);

export const fetchMiniAppsBySubject = createAsyncThunk(
  'subjects/fetchMiniAppsBySubject',
  async (
    { fieldSlug, subjectSlug }: { fieldSlug: string; subjectSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/miniapps`
      );
      return res.data.data as IMiniApp[];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch mini-apps');
    }
  }
);

const subjectsSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjectBySlug.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubjectBySlug.fulfilled, (state, action) => {
        state.isLoading = false;
        const { fieldSlug, subjectSlug } = action.meta.arg;
        state.subjectsByKey[subjectKey(fieldSlug, subjectSlug)] = action.payload;
      })
      .addCase(fetchSubjectBySlug.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMiniAppsBySubject.fulfilled, (state, action) => {
        const { fieldSlug, subjectSlug } = action.meta.arg;
        state.miniAppsByKey[subjectKey(fieldSlug, subjectSlug)] = action.payload;
      });
  },
});

export default subjectsSlice.reducer;
