import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';
import enrollmentReducer from '../features/enrollment/enrollmentSlice';
import roadmapReducer from '../features/roadmap/roadmapSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    enrollment: enrollmentReducer,
    roadmap: roadmapReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
