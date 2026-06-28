import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../lib/axios';
import type {
  EnrolledSubjectsResponse,
  AvailableSubject,
  IProfileSubjectEnrollment,
} from '@my-backpack/shared';

type FieldInfo = { _id: string; name: string; slug: string };

interface EnrollmentState {
  enrolledSubjects: EnrolledSubjectsResponse | null;
  availableSubjects: AvailableSubject[];
  activeField: FieldInfo | null;
  activeSubject: IProfileSubjectEnrollment | null;
  isLoading: boolean;
  isEnrolling: boolean;
  error: string | null;
}

const initialState: EnrollmentState = {
  enrolledSubjects: null,
  availableSubjects: [],
  activeField: null,
  activeSubject: null,
  isLoading: false,
  isEnrolling: false,
  error: null,
};

export const fetchEnrolledSubjects = createAsyncThunk(
  'enrollment/fetchEnrolledSubjects',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/enrollment/subjects');
      return res.data.data as EnrolledSubjectsResponse;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch enrolled subjects');
    }
  }
);

export const fetchAvailableSubjects = createAsyncThunk(
  'enrollment/fetchAvailableSubjects',
  async (fieldSlug: string | undefined, { rejectWithValue }) => {
    try {
      const params = fieldSlug ? `?fieldSlug=${fieldSlug}` : '';
      const res = await axiosInstance.get(`/enrollment/subjects/available${params}`);
      return res.data.data.subjects as AvailableSubject[];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch available subjects');
    }
  }
);

export const enrollInSubject = createAsyncThunk(
  'enrollment/enrollInSubject',
  async (subjectId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post('/enrollment/subjects', { subjectId });
      return res.data.data as { enrollment: IProfileSubjectEnrollment };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to enroll in subject');
    }
  }
);

export const unenrollFromSubject = createAsyncThunk(
  'enrollment/unenrollFromSubject',
  async (subjectId: string, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/enrollment/subjects/${subjectId}`);
      return subjectId;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to unenroll');
    }
  }
);

export const markSubjectAccessed = createAsyncThunk(
  'enrollment/markSubjectAccessed',
  async (subjectId: string, { rejectWithValue }) => {
    try {
      await axiosInstance.patch(`/enrollment/subjects/${subjectId}/accessed`);
      return subjectId;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(e.response?.data?.message ?? 'Failed to mark accessed');
    }
  }
);

const enrollmentSlice = createSlice({
  name: 'enrollment',
  initialState,
  reducers: {
    setActiveField(state, action: PayloadAction<FieldInfo | null>) {
      state.activeField = action.payload;
    },
    setActiveSubject(state, action: PayloadAction<IProfileSubjectEnrollment | null>) {
      state.activeSubject = action.payload;
    },
    clearEnrollmentError(state) {
      state.error = null;
    },
    resetEnrolledSubjects(state) {
      state.enrolledSubjects = null;
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
        // Auto-set active field to first field if none selected
        if (!state.activeField && action.payload.fields.length > 0) {
          state.activeField = action.payload.fields[0].field;
        }
      })
      .addCase(fetchEnrolledSubjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAvailableSubjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableSubjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableSubjects = action.payload;
      })
      .addCase(fetchAvailableSubjects.rejected, (state, action) => {
        state.isLoading = false;
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
      });
  },
});

export const { setActiveField, setActiveSubject, clearEnrollmentError, resetEnrolledSubjects } =
  enrollmentSlice.actions;
export default enrollmentSlice.reducer;
