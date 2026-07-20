import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import contentReducer from '../features/content/contentSlice';
import vocabReducer from '../features/vocab/vocabSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    content: contentReducer,
    vocab: vocabReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
