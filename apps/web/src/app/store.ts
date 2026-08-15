import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';
import enrollmentReducer from '../features/enrollment/enrollmentSlice';
import subjectsReducer from '../features/subjects/subjectsSlice';
import coursesReducer from '../features/courses/coursesSlice';
import roadmapReducer from '../features/roadmap/roadmapSlice';
import vocabReducer from '../features/vocab/vocabSlice';
import quizReducer from '../features/quiz/quizSlice';
import quizHistoryReducer from '../features/quizHistory/quizHistorySlice';
import studioReducer from '../features/studio/studioSlice';
import aiChatReducer from '../features/aiChat/aiChatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    enrollment: enrollmentReducer,
    subjects: subjectsReducer,
    courses: coursesReducer,
    roadmap: roadmapReducer,
    vocab: vocabReducer,
    quiz: quizReducer,
    quizHistory: quizHistoryReducer,
    studio: studioReducer,
    aiChat: aiChatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
