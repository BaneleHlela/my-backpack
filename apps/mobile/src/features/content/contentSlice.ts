// Combines apps/web's enrollmentSlice.ts (fetchEnrolledSubjects,
// fetchAvailableSubjects, enrollInSubject), a flat mini-apps-per-subject
// fetch, and a Courses-per-subject fetch into one slice — kept as a single
// slice (not split into subjectsSlice/coursesSlice like web) since mobile
// doesn't yet have web's independently-reused-pages pressure that motivated
// that split (see docs/technical/mobile-architecture.md). MiniApps are flat
// under a Subject now (Topic was removed) — no grouping layer to reproduce.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type {
  ApiResponse,
  EnrolledSubjectsResponse,
  AvailableSubject,
  IMiniApp,
  ICourseSummary,
} from '@my-backpack/shared';
import api from '../../lib/api';

interface ContentState {
  enrolledSubjects: EnrolledSubjectsResponse | null;
  availableSubjects: AvailableSubject[];
  miniAppsBySubject: Record<string, IMiniApp[]>;
  // Keyed by `${fieldSlug}/${subjectSlug}` — Subject.slug/Course.slug are only unique
  // per-field/per-subject, mirroring web's subjectsSlice/coursesSlice key convention.
  coursesByKey: Record<string, ICourseSummary[]>;
  // The list endpoint above returns miniAppIds as plain unpopulated id strings — only the
  // single-course detail endpoint populates them to { name, slug, type, description }, which
  // CoursePage needs for its linked-MiniApps quick-links row. Keyed by
  // `${fieldSlug}/${subjectSlug}/${courseSlug}`.
  courseDetailByKey: Record<string, ICourseSummary>;
  isLoading: boolean;
  isLoadingAvailable: boolean;
  isLoadingCourses: boolean;
  isEnrolling: boolean;
  error: string | null;
}

const initialState: ContentState = {
  enrolledSubjects: null,
  availableSubjects: [],
  miniAppsBySubject: {},
  coursesByKey: {},
  courseDetailByKey: {},
  isLoading: false,
  isLoadingAvailable: false,
  isLoadingCourses: false,
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

// Fetch a subject's mini-apps (flat — no Topic grouping layer anymore).
export const fetchSubjectMiniApps = createAsyncThunk(
  'content/fetchSubjectMiniApps',
  async (
    { fieldSlug, subjectSlug, subjectId }: { fieldSlug: string; subjectSlug: string; subjectId: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.get<ApiResponse<IMiniApp[]>>(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/miniapps`
      );
      return { subjectId, miniApps: res.data.data };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch subject mini-apps'));
    }
  }
);

// Fetch a subject's Courses (each wraps one Roadmap — see CLAUDE.md's Content Hierarchy).
export const fetchCoursesBySubject = createAsyncThunk(
  'content/fetchCoursesBySubject',
  async ({ fieldSlug, subjectSlug }: { fieldSlug: string; subjectSlug: string }, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<ICourseSummary[]>>(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/courses`
      );
      return { key: `${fieldSlug}/${subjectSlug}`, courses: res.data.data };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch courses'));
    }
  }
);

// Fetch one course's full detail (populated miniAppIds) — used only for the
// linked-MiniApps quick-links row, since the list fetch above already covers everything
// else CoursePage needs (name/description/roadmap.nodeCount) for a course reached via
// Home -> Subject -> Course navigation.
export const fetchCourseDetail = createAsyncThunk(
  'content/fetchCourseDetail',
  async (
    { fieldSlug, subjectSlug, courseSlug }: { fieldSlug: string; subjectSlug: string; courseSlug: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.get<ApiResponse<ICourseSummary>>(
        `/content/fields/${fieldSlug}/subjects/${subjectSlug}/courses/${courseSlug}`
      );
      return { key: `${fieldSlug}/${subjectSlug}/${courseSlug}`, course: res.data.data };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch course'));
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
      .addCase(fetchSubjectMiniApps.fulfilled, (state, action) => {
        state.miniAppsBySubject[action.payload.subjectId] = action.payload.miniApps;
      })
      .addCase(fetchCoursesBySubject.pending, (state) => {
        state.isLoadingCourses = true;
      })
      .addCase(fetchCoursesBySubject.fulfilled, (state, action) => {
        state.isLoadingCourses = false;
        state.coursesByKey[action.payload.key] = action.payload.courses;
      })
      .addCase(fetchCoursesBySubject.rejected, (state, action) => {
        state.isLoadingCourses = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCourseDetail.fulfilled, (state, action) => {
        state.courseDetailByKey[action.payload.key] = action.payload.course;
      });
  },
});

export const { clearContentError } = contentSlice.actions;
export default contentSlice.reducer;
