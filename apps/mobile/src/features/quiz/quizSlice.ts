// Direct port of apps/web's features/quiz/quizSlice.ts, scoped down per Decision 5 in the
// mobile roadmap/quiz plan: only the thunks the real QuizItemPlayerPage actually calls
// (startQuizItemSession, submitAnswer, completeSession, abandonSession) — the generic
// miniAppId-based startSession, and the unused GET session/:id + GET results endpoints, are
// left out entirely rather than ported speculatively.
//
// The quiz API delivers one question at a time rather than a full question list:
// POST .../start returns { session, firstQuestion }, and POST .../answer returns
// { ..., nextQuestion, sessionComplete }. There is no batch question-fetch endpoint, so this
// slice tracks `currentQuestion` (swapped out after each answer) instead of a
// `questions[] + currentIndex` pair.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type { ApiResponse, FeedbackMode, IQuestion, ResponseType, SessionResults } from '@my-backpack/shared';
import api from '../../lib/api';

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message ?? fallback;
}

export function responseTypeForQuestion(type: IQuestion['type']): ResponseType {
  if (type.startsWith('mcq_')) return 'mcq_selection';
  if (type.startsWith('true_false_')) return 'true_false';
  return 'text_input';
}

interface LastAnswer {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  confidenceAfter: number;
  sessionComplete: boolean;
  wasSkipped: boolean;
}

// One entry per answered question — accumulated so the 'end' feedbackMode can show a single
// results-screen breakdown instead of per-question modals.
export interface AnsweredQuestionSummary {
  questionId: string;
  prompt?: string;
  rawResponse: string;
  correctAnswer?: string;
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  wasSkipped: boolean;
}

interface QuizProgress {
  answered: number;
  total: number;
  correct: number;
}

type QuizStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'submitting'
  | 'awaiting_advance'
  | 'completing'
  | 'completed'
  | 'error';

interface QuizState {
  sessionId: string | null;
  status: QuizStatus;
  currentQuestion: IQuestion | null;
  pendingNextQuestion: IQuestion | null;
  lastAnswer: LastAnswer | null;
  progress: QuizProgress;
  results: SessionResults | null;
  error: string | null;
  feedbackMode: FeedbackMode;
  answeredQuestions: AnsweredQuestionSummary[];
}

const initialState: QuizState = {
  sessionId: null,
  status: 'idle',
  currentQuestion: null,
  pendingNextQuestion: null,
  lastAnswer: null,
  progress: { answered: 0, total: 0, correct: 0 },
  results: null,
  error: null,
  feedbackMode: 'immediate',
  answeredQuestions: [],
};

interface StartSessionResult {
  session: { _id: string; questionIds: string[]; settings: { feedbackMode: FeedbackMode } };
  firstQuestion: IQuestion | null;
}

// Starts a quiz session for a roadmap quiz item — the node/item-scoped roadmap endpoint
// (quiz items don't expose start-time settings overrides, unlike the generic /quiz/session
// route this app doesn't use).
export const startQuizItemSession = createAsyncThunk(
  'quiz/startQuizItemSession',
  async ({ nodeId, itemId }: { nodeId: string; itemId: string }, { rejectWithValue }) => {
    try {
      const res = await api.post<ApiResponse<StartSessionResult>>(
        `/roadmap/node/${nodeId}/item/${itemId}/start`
      );
      return res.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to start quiz'));
    }
  }
);

interface CaptureAnswerResult {
  answerRecordId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  confidenceAfter: number;
  nextQuestion: IQuestion | null;
  sessionComplete: boolean;
}

export const submitAnswer = createAsyncThunk(
  'quiz/submitAnswer',
  async (
    {
      sessionId,
      questionId,
      rawResponse,
      selectedOptionIndex,
      timeToAnswerMs,
      wasSkipped,
    }: {
      sessionId: string;
      questionId: string;
      rawResponse: string;
      selectedOptionIndex?: number;
      timeToAnswerMs: number;
      wasSkipped?: boolean;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { quiz: QuizState };
      const responseType = state.quiz.currentQuestion
        ? responseTypeForQuestion(state.quiz.currentQuestion.type)
        : 'text_input';
      const res = await api.post<ApiResponse<CaptureAnswerResult>>(`/quiz/session/${sessionId}/answer`, {
        questionId,
        responseType,
        rawResponse,
        selectedOptionIndex,
        timeToAnswerMs,
        wasSkipped,
      });
      return res.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to submit answer'));
    }
  }
);

export const completeSession = createAsyncThunk(
  'quiz/completeSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const res = await api.patch<ApiResponse<{ results?: SessionResults }>>(
        `/quiz/session/${sessionId}/complete`
      );
      return res.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to complete quiz'));
    }
  }
);

// Fire-and-forget — used when the learner navigates away mid-session (hardware back, swipe
// back, or app backgrounding while a quiz is active).
export const abandonSession = createAsyncThunk('quiz/abandonSession', async (sessionId: string) => {
  try {
    await api.patch(`/quiz/session/${sessionId}/abandon`);
  } catch {
    // Best-effort — ignore failures, the session simply remains active server-side.
  }
});

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    advanceQuestion(state) {
      if (state.pendingNextQuestion) {
        state.currentQuestion = state.pendingNextQuestion;
        state.pendingNextQuestion = null;
        state.lastAnswer = null;
        state.status = 'active';
      }
    },
    resetQuiz() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startQuizItemSession.pending, (state) => {
        state.status = 'starting';
        state.error = null;
      })
      .addCase(startQuizItemSession.fulfilled, (state, action) => {
        state.sessionId = action.payload.session._id;
        state.currentQuestion = action.payload.firstQuestion;
        state.feedbackMode = action.payload.session.settings.feedbackMode;
        state.answeredQuestions = [];
        state.progress = {
          answered: 0,
          total: action.payload.session.questionIds.length,
          correct: 0,
        };
        state.status = action.payload.firstQuestion ? 'active' : 'completed';
      })
      .addCase(startQuizItemSession.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(submitAnswer.pending, (state) => {
        state.status = 'submitting';
        state.error = null;
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        const questionId = state.currentQuestion?._id ?? '';
        state.lastAnswer = {
          questionId,
          isCorrect: action.payload.isCorrect,
          pointsAwarded: action.payload.pointsAwarded,
          maxPoints: state.currentQuestion?.maxPoints ?? 0,
          confidenceAfter: action.payload.confidenceAfter,
          sessionComplete: action.payload.sessionComplete,
          wasSkipped: action.meta.arg.wasSkipped ?? false,
        };
        state.answeredQuestions.push({
          questionId,
          prompt: state.currentQuestion?.content.prompt,
          rawResponse: action.meta.arg.rawResponse,
          correctAnswer: state.currentQuestion?.content.correctAnswer,
          isCorrect: action.payload.isCorrect,
          pointsAwarded: action.payload.pointsAwarded,
          maxPoints: state.currentQuestion?.maxPoints ?? 0,
          wasSkipped: action.meta.arg.wasSkipped ?? false,
        });
        state.pendingNextQuestion = action.payload.nextQuestion;
        state.progress = {
          ...state.progress,
          answered: state.progress.answered + 1,
          correct: state.progress.correct + (action.payload.isCorrect ? 1 : 0),
        };
        state.status = 'awaiting_advance';
      })
      .addCase(submitAnswer.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(completeSession.pending, (state) => {
        state.status = 'completing';
      })
      .addCase(completeSession.fulfilled, (state, action) => {
        state.status = 'completed';
        state.results = action.payload.results ?? null;
      })
      .addCase(completeSession.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      });
  },
});

export const { advanceQuestion, resetQuiz } = quizSlice.actions;
export default quizSlice.reducer;
