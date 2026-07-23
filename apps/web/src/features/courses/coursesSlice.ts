import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../lib/axios';
import type { ICourseSummary } from '@my-backpack/shared';

interface CoursesState {
  coursesByKey: Record<string, ICourseSummary[]>;
  currentCourse: ICourseSummary | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CoursesState = {
  coursesByKey: {},
  currentCourse: null,
  isLoading: false,
  error: null,
};

function subjectKey(fieldSlug: string, subjectSlug: string): string {
  return `${fieldSlug}/${subjectSlug}`;
}

export const fetchCoursesBySubject = createAsyncThunk(
  'courses/fetchCoursesBySubject',
  async (
    { fieldSlug, subjectSlug }: { fieldSlug: string; subjectSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/courses`
      );
      return res.data.data as ICourseSummary[];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch courses');
    }
  }
);

// Fallback for a direct link/refresh on the course page, where the courses list isn't in
// state yet — fetches a single course by slug instead of the whole subject's course list.
export const fetchCourseBySlug = createAsyncThunk(
  'courses/fetchCourseBySlug',
  async (
    {
      fieldSlug,
      subjectSlug,
      courseSlug,
    }: { fieldSlug: string; subjectSlug: string; courseSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/courses/${courseSlug}`
      );
      return res.data.data as ICourseSummary;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch course');
    }
  }
);

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearCourses(state) {
      state.coursesByKey = {};
      state.currentCourse = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoursesBySubject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCoursesBySubject.fulfilled, (state, action) => {
        state.isLoading = false;
        const { fieldSlug, subjectSlug } = action.meta.arg;
        state.coursesByKey[subjectKey(fieldSlug, subjectSlug)] = action.payload;
      })
      .addCase(fetchCoursesBySubject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCourseBySlug.fulfilled, (state, action) => {
        state.currentCourse = action.payload;
      });
  },
});

export const { clearCourses } = coursesSlice.actions;
export default coursesSlice.reducer;
