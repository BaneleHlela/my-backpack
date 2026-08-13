// Redux slice for Course Chat's AI Helper — course-scoped 1:1 chat with the AI. Mirrors
// quizSlice.ts's conventions (rejectWithValue + shared extractErrorMessage, string-union
// status). State is keyed by courseId so switching between courses' chats never clobbers
// each other's history in memory.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type { ApiResponse, IAiChatMessage, IAiChatSendMessageResponse } from '@my-backpack/shared';
import api from '../../lib/api';

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

type HistoryStatus = 'idle' | 'loading' | 'loaded' | 'error';
type SendStatus = 'idle' | 'sending' | 'error';

interface AiChatState {
  messagesByCourseId: Record<string, IAiChatMessage[]>;
  historyStatus: HistoryStatus;
  sendStatus: SendStatus;
  error: string | null;
}

const initialState: AiChatState = {
  messagesByCourseId: {},
  historyStatus: 'idle',
  sendStatus: 'idle',
  error: null,
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

const aiChatSlice = createSlice({
  name: 'aiChat',
  initialState,
  reducers: {
    resetAiChatError(state) {
      state.error = null;
      state.sendStatus = 'idle';
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
      });
  },
});

export const { resetAiChatError } = aiChatSlice.actions;
export default aiChatSlice.reducer;
