import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';
import enrollmentReducer from '../features/enrollment/enrollmentSlice';
import roadmapReducer from '../features/roadmap/roadmapSlice';
import vocabReducer from '../features/vocab/vocabSlice';
import quizReducer from '../features/quiz/quizSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    enrollment: enrollmentReducer,
    roadmap: roadmapReducer,
    vocab: vocabReducer,
    quiz: quizReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
