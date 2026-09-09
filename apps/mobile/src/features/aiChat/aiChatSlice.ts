// Redux slice for Course Chat's AI Helper — course-scoped 1:1 chat with the AI. Mirrors
// quizSlice.ts's conventions (rejectWithValue + shared extractErrorMessage, string-union
// status). State is keyed by courseId so switching between courses' chats never clobbers
// each other's history in memory.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type {
  ApiResponse,
  IAiChatMessage,
  IAiChatSendMessageResponse,
  IPracticeQuestionsResponse,
  IQuestion,
} from '@my-backpack/shared';
import api from '../../lib/api';

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

type HistoryStatus = 'idle' | 'loading' | 'loaded' | 'error';
type SendStatus = 'idle' | 'sending' | 'error';
// Book-to-course pipeline, Phase 4b/7 — "Quiz me on this chapter" suggested action.
type PracticeQuestionsStatus = 'idle' | 'loading' | 'error';

interface AiChatState {
  messagesByCourseId: Record<string, IAiChatMessage[]>;
  historyStatus: HistoryStatus;
  sendStatus: SendStatus;
  error: string | null;
  // Not persisted as chat messages — a lightweight in-chat practice widget, keyed by courseId
  // so switching courses doesn't leave a stale widget visible.
  practiceQuestionsByCourseId: Record<string, IQuestion[]>;
  practiceQuestionsStatus: PracticeQuestionsStatus;
  practiceQuestionsError: string | null;
}

const initialState: AiChatState = {
  messagesByCourseId: {},
  historyStatus: 'idle',
  sendStatus: 'idle',
  error: null,
  practiceQuestionsByCourseId: {},
  practiceQuestionsStatus: 'idle',
  practiceQuestionsError: null,
};

export const fetchChatHistory = createAsyncThunk(
  'aiChat/fetchChatHistory',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const res = await api.get<ApiResponse<{ messages: IAiChatMessage[] }>>(
        `/ai-chat/course/${courseId}/history`
      );
      return { courseId, messages: res.data.data.messages };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load chat history'));
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'aiChat/sendChatMessage',
  async ({ courseId, message }: { courseId: string; message: string }, { rejectWithValue }) => {
    try {
      const res = await api.post<ApiResponse<IAiChatSendMessageResponse>>(
        `/ai-chat/course/${courseId}/message`,
        { message }
      );
      return { courseId, ...res.data.data };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to send message'));
    }
  }
);

// Book-to-course pipeline, Phase 4b — "Quiz me on this chapter" chip. Called directly (not
// sent as a chat message) — see the API's aiChat.service.ts's getPracticeQuestionsForProfile.
export const fetchPracticeQuestions = createAsyncThunk(
  'aiChat/fetchPracticeQuestions',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const res = await api.post<ApiResponse<IPracticeQuestionsResponse>>(
        `/ai-chat/course/${courseId}/practice-questions`
      );
      return { courseId, questions: res.data.data.questions };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to generate practice questions'));
    }
  }
);

const aiChatSlice = createSlice({
  name: 'aiChat',
  initialState,
  reducers: {
    resetAiChatError(state) {
      state.error = null;
      state.sendStatus = 'idle';
    },
    clearPracticeQuestions(state, action: { payload: string }) {
      delete state.practiceQuestionsByCourseId[action.payload];
      state.practiceQuestionsStatus = 'idle';
      state.practiceQuestionsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatHistory.pending, (state) => {
        state.historyStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.historyStatus = 'loaded';
        state.messagesByCourseId[action.payload.courseId] = action.payload.messages;
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.historyStatus = 'error';
        state.error = action.payload as string;
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.sendStatus = 'sending';
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.sendStatus = 'idle';
        const existing = state.messagesByCourseId[action.payload.courseId] ?? [];
        state.messagesByCourseId[action.payload.courseId] = [
          ...existing,
          action.payload.userMessage,
          action.payload.assistantMessage,
        ];
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.sendStatus = 'error';
        state.error = action.payload as string;
      })
      .addCase(fetchPracticeQuestions.pending, (state) => {
        state.practiceQuestionsStatus = 'loading';
        state.practiceQuestionsError = null;
      })
      .addCase(fetchPracticeQuestions.fulfilled, (state, action) => {
        state.practiceQuestionsStatus = 'idle';
        state.practiceQuestionsByCourseId[action.payload.courseId] = action.payload.questions;
      })
      .addCase(fetchPracticeQuestions.rejected, (state, action) => {
        state.practiceQuestionsStatus = 'error';
        state.practiceQuestionsError = action.payload as string;
      });
  },
});

export const { resetAiChatError, clearPracticeQuestions } = aiChatSlice.actions;
export default aiChatSlice.reducer;
