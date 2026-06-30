// Redux slice for the Dictionary mini-app: search, term detail, bucket, trending,
// recent searches, and A-Z browse. Follows the axios + createAsyncThunk pattern
// already established in roadmapSlice/enrollmentSlice.
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../lib/axios';
import type { ITerm, IDefinition } from '@my-backpack/shared';

// ── Response shapes (mirror apps/api/src/modules/vocab/vocab.types.ts) ────────

export interface VocabSearchResult {
  term: ITerm;
  definitions: IDefinition[];
  isInBucket: boolean;
  isNew: boolean;
}

export interface DefinitionWithStatus {
  definition: IDefinition;
  inBucket: boolean;
  learningRecord: { confidenceScore: number; status: string; totalAnswers: number } | null;
}

export interface TermDetailResult {
  term: ITerm;
  definitions: DefinitionWithStatus[];
}

export interface TrendingTermResult {
  term: { _id: string; word: string; phonetic?: string; audioUrl?: string };
  primaryDefinition: string | null;
  bucketCount: number;
}

export interface BucketTermEntryLite {
  entry: {
    _id: string;
    termId: string;
    definitionId: string;
    partOfSpeech: string;
    status: string;
    addedAt: string;
  };
  term: { _id: string; word: string; phonetic?: string; audioUrl?: string };
  definition: { _id: string; definition: string; examples: string[]; partOfSpeech: string };
  learningRecord: {
    confidenceScore: number;
    learningStatus: string;
    totalAnswers: number;
    correctAnswers: number;
    lastAnsweredAt: string | null;
    nextReviewAt: string | null;
    masteredAt: string | null;
  } | null;
}

export interface BucketPagination {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DictionaryTermPreview {
  _id: string;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  definitionCount: number;
}

export interface DictionaryBrowsePagination {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

// ── State ──────────────────────────────────────────────────────────────────

interface VocabState {
  searchResult: VocabSearchResult | null;
  searchStatus: 'idle' | 'loading' | 'success' | 'not_found' | 'error';
  searchError: string | null;

  activeTerm: TermDetailResult | null;
  activeTermLoading: boolean;
  activeTermError: string | null;

  trending: TrendingTermResult[];
  trendingLoading: boolean;

  recent: BucketTermEntryLite[];
  recentLoading: boolean;

  alphabet: string[];
  alphabetLoading: boolean;

  browseLetter: string;
  browseResults: DictionaryTermPreview[];
  browsePagination: DictionaryBrowsePagination | null;
  browseLoading: boolean;

  addingDefinitionIds: string[];
  addError: string | null;

  bucket: BucketTermEntryLite[];
  bucketPagination: BucketPagination | null;
  bucketStatusFilter: 'learning' | 'mastered' | 'paused' | 'all';
  bucketLoading: boolean;
  bucketError: string | null;
  removingTermIds: string[];
}

const initialState: VocabState = {
  searchResult: null,
  searchStatus: 'idle',
  searchError: null,

  activeTerm: null,
  activeTermLoading: false,
  activeTermError: null,

  trending: [],
  trendingLoading: false,

  recent: [],
  recentLoading: false,

  alphabet: [],
  alphabetLoading: false,

  browseLetter: 'a',
  browseResults: [],
  browsePagination: null,
  browseLoading: false,

  addingDefinitionIds: [],
  addError: null,

  bucket: [],
  bucketPagination: null,
  bucketStatusFilter: 'all',
  bucketLoading: false,
  bucketError: null,
  removingTermIds: [],
};

// ── Thunks ─────────────────────────────────────────────────────────────────

export const searchVocab = createAsyncThunk(
  'vocab/search',
  async ({ word, miniAppId }: { word: string; miniAppId: string }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/vocab/search', { params: { word, miniAppId } });
      return res.data.data as VocabSearchResult;
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 404) {
        return rejectWithValue({ notFound: true });
      }
      return rejectWithValue({ message: extractErrorMessage(err, 'Search failed') });
    }
  }
);

export const fetchTermDetail = createAsyncThunk(
  'vocab/fetchTermDetail',
  async (termId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/vocab/terms/${termId}`);
      return res.data.data as TermDetailResult;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load term'));
    }
  }
);

export const addDefinitionToBucket = createAsyncThunk(
  'vocab/addDefinitionToBucket',
  async (
    { termId, definitionId, miniAppId }: { termId: string; definitionId: string; miniAppId: string },
    { rejectWithValue }
  ) => {
    try {
      await axiosInstance.post('/vocab/bucket', { termId, definitionId, miniAppId });
      return { definitionId };
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 409) {
        // Already in bucket — treat as a successful (idempotent) outcome.
        return { definitionId };
      }
      return rejectWithValue({
        definitionId,
        message: extractErrorMessage(err, 'Failed to add to bucket'),
      });
    }
  }
);

export const fetchTrending = createAsyncThunk(
  'vocab/fetchTrending',
  async ({ miniAppId, limit = 10 }: { miniAppId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/vocab/trending', { params: { miniAppId, limit } });
      return res.data.data as TrendingTermResult[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load trending terms'));
    }
  }
);

export const fetchRecent = createAsyncThunk(
  'vocab/fetchRecent',
  async ({ miniAppId, limit = 10 }: { miniAppId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/vocab/recent', { params: { miniAppId, limit } });
      return res.data.data as BucketTermEntryLite[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load recent searches'));
    }
  }
);

export const fetchAlphabet = createAsyncThunk(
  'vocab/fetchAlphabet',
  async (miniAppId: string, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/vocab/dictionary/alphabet', { params: { miniAppId } });
      return (res.data.data.available as string[]).map((l) => l.toUpperCase());
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load alphabet'));
    }
  }
);

export const browseDictionary = createAsyncThunk(
  'vocab/browseDictionary',
  async (
    { miniAppId, letter, page = 1, limit = 20 }: { miniAppId: string; letter: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get('/vocab/dictionary', {
        params: { miniAppId, letter, page, limit },
      });
      return res.data.data as {
        terms: DictionaryTermPreview[];
        pagination: DictionaryBrowsePagination;
        letter: string;
      };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load dictionary'));
    }
  }
);

export const fetchBucket = createAsyncThunk(
  'vocab/fetchBucket',
  async (
    {
      miniAppId,
      status = 'all',
      page = 1,
      limit = 50,
    }: { miniAppId: string; status?: 'learning' | 'mastered' | 'paused' | 'all'; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosInstance.get('/vocab/bucket', {
        params: { miniAppId, status, page, limit },
      });
      return res.data.data as { terms: BucketTermEntryLite[]; pagination: BucketPagination };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load bucket'));
    }
  }
);

export const removeBucketEntry = createAsyncThunk(
  'vocab/removeBucketEntry',
  async ({ termId, miniAppId }: { termId: string; miniAppId: string }, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/vocab/bucket/${termId}`, { params: { miniAppId } });
      return { termId };
    } catch (err) {
      return rejectWithValue({
        termId,
        message: extractErrorMessage(err, 'Failed to remove term from bucket'),
      });
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────

const vocabSlice = createSlice({
  name: 'vocab',
  initialState,
  reducers: {
    clearSearch(state) {
      state.searchResult = null;
      state.searchStatus = 'idle';
      state.searchError = null;
    },
    clearActiveTerm(state) {
      state.activeTerm = null;
      state.activeTermError = null;
    },
    setBrowseLetter(state, action: { payload: string }) {
      state.browseLetter = action.payload;
    },
    setBucketStatusFilter(
      state,
      action: { payload: 'learning' | 'mastered' | 'paused' | 'all' }
    ) {
      state.bucketStatusFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // search
      .addCase(searchVocab.pending, (state) => {
        state.searchStatus = 'loading';
        state.searchError = null;
      })
      .addCase(searchVocab.fulfilled, (state, action) => {
        state.searchStatus = 'success';
        state.searchResult = action.payload;
      })
      .addCase(searchVocab.rejected, (state, action) => {
        const payload = action.payload as { notFound?: boolean; message?: string } | undefined;
        state.searchResult = null;
        if (payload?.notFound) {
          state.searchStatus = 'not_found';
        } else {
          state.searchStatus = 'error';
          state.searchError = payload?.message ?? 'Search failed';
        }
      })
      // term detail
      .addCase(fetchTermDetail.pending, (state) => {
        state.activeTermLoading = true;
        state.activeTermError = null;
      })
      .addCase(fetchTermDetail.fulfilled, (state, action) => {
        state.activeTermLoading = false;
        state.activeTerm = action.payload;
      })
      .addCase(fetchTermDetail.rejected, (state, action) => {
        state.activeTermLoading = false;
        state.activeTermError = action.payload as string;
      })
      // add to bucket
      .addCase(addDefinitionToBucket.pending, (state, action) => {
        state.addingDefinitionIds.push(action.meta.arg.definitionId);
        state.addError = null;
      })
      .addCase(addDefinitionToBucket.fulfilled, (state, action) => {
        state.addingDefinitionIds = state.addingDefinitionIds.filter(
          (id) => id !== action.payload.definitionId
        );
        if (state.activeTerm) {
          const def = state.activeTerm.definitions.find(
            (d) => d.definition._id === action.payload.definitionId
          );
          if (def) def.inBucket = true;
        }
      })
      .addCase(addDefinitionToBucket.rejected, (state, action) => {
        const payload = action.payload as { definitionId: string; message: string } | undefined;
        if (payload) {
          state.addingDefinitionIds = state.addingDefinitionIds.filter(
            (id) => id !== payload.definitionId
          );
          state.addError = payload.message;
        }
      })
      // trending
      .addCase(fetchTrending.pending, (state) => {
        state.trendingLoading = true;
      })
      .addCase(fetchTrending.fulfilled, (state, action) => {
        state.trendingLoading = false;
        state.trending = action.payload;
      })
      .addCase(fetchTrending.rejected, (state) => {
        state.trendingLoading = false;
      })
      // recent
      .addCase(fetchRecent.pending, (state) => {
        state.recentLoading = true;
      })
      .addCase(fetchRecent.fulfilled, (state, action) => {
        state.recentLoading = false;
        state.recent = action.payload;
      })
      .addCase(fetchRecent.rejected, (state) => {
        state.recentLoading = false;
      })
      // alphabet
      .addCase(fetchAlphabet.pending, (state) => {
        state.alphabetLoading = true;
      })
      .addCase(fetchAlphabet.fulfilled, (state, action) => {
        state.alphabetLoading = false;
        state.alphabet = action.payload;
      })
      .addCase(fetchAlphabet.rejected, (state) => {
        state.alphabetLoading = false;
      })
      // browse
      .addCase(browseDictionary.pending, (state) => {
        state.browseLoading = true;
      })
      .addCase(browseDictionary.fulfilled, (state, action) => {
        state.browseLoading = false;
        state.browseResults = action.payload.terms;
        state.browsePagination = action.payload.pagination;
        state.browseLetter = action.payload.letter.toUpperCase();
      })
      .addCase(browseDictionary.rejected, (state) => {
        state.browseLoading = false;
      })
      // bucket
      .addCase(fetchBucket.pending, (state) => {
        state.bucketLoading = true;
        state.bucketError = null;
      })
      .addCase(fetchBucket.fulfilled, (state, action) => {
        state.bucketLoading = false;
        state.bucket = action.payload.terms;
        state.bucketPagination = action.payload.pagination;
      })
      .addCase(fetchBucket.rejected, (state, action) => {
        state.bucketLoading = false;
        state.bucketError = action.payload as string;
      })
      // remove bucket entry
      .addCase(removeBucketEntry.pending, (state, action) => {
        state.removingTermIds.push(action.meta.arg.termId);
      })
      .addCase(removeBucketEntry.fulfilled, (state, action) => {
        state.removingTermIds = state.removingTermIds.filter(
          (id) => id !== action.payload.termId
        );
        state.bucket = state.bucket.filter((e) => e.entry.termId !== action.payload.termId);
        if (state.bucketPagination) {
          state.bucketPagination.total = Math.max(0, state.bucketPagination.total - 1);
        }
      })
      .addCase(removeBucketEntry.rejected, (state, action) => {
        const payload = action.payload as { termId: string; message: string } | undefined;
        if (payload) {
          state.removingTermIds = state.removingTermIds.filter((id) => id !== payload.termId);
          state.bucketError = payload.message;
        }
      });
  },
});

export const { clearSearch, clearActiveTerm, setBrowseLetter, setBucketStatusFilter } =
  vocabSlice.actions;
export default vocabSlice.reducer;
