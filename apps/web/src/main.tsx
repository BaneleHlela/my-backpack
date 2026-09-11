import React, { useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { store } from './app/store';
import type { AppDispatch, RootState } from './app/store';
import { injectStore, noteSessionActivity } from './lib/axios';
import { checkAuth, fetchActiveProfile } from './features/auth/authSlice';

import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SelectProfilePage from './pages/SelectProfilePage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SubjectHomePage from './pages/subject/SubjectHomePage';
import CoursePage from './pages/course/CoursePage';
import CourseChatPage from './pages/course/CourseChatPage';
import CourseChatAiHelperPage from './pages/course/CourseChatAiHelperPage';
import LessonPlayerPage from './pages/lesson/LessonPlayerPage';
import QuizItemPlayerPage from './pages/lesson/QuizItemPlayerPage';
import MiniAppPage from './pages/miniapp/MiniAppPage';
import QuizHistoryPage from './pages/quizHistory/QuizHistoryPage';
import QuizHistoryReviewPage from './pages/quizHistory/QuizHistoryReviewPage';
import QuizHistoryPlayPage from './pages/quizHistory/QuizHistoryPlayPage';
import StudioLayout from './pages/studio/StudioLayout';
import CoursesListPage from './pages/studio/CoursesListPage';
import CourseDetailPage from './pages/studio/CourseDetailPage';
import NodeDetailPage from './pages/studio/NodeDetailPage';
import LessonEditorPage from './pages/studio/LessonEditorPage';
import QuizEditorPage from './pages/studio/QuizEditorPage';
import QuestionEditorPage from './pages/studio/QuestionEditorPage';

import './index.css';
import Scribbler from './pages/Scribbler';

injectStore(store);

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>();
  const { bootstrapError, isCheckingAuth } = useSelector((state: RootState) => state.auth);
  const initialize = useCallback(async () => {
    const result = await dispatch(checkAuth());
    if (checkAuth.fulfilled.match(result) && result.payload) {
      void dispatch(fetchActiveProfile());
    }
  }, [dispatch]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'visible' || isCheckingAuth) return;
      if (bootstrapError) void initialize();
      else noteSessionActivity();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('pointerdown', noteSessionActivity, { passive: true });
    document.addEventListener('keydown', noteSessionActivity);
    document.addEventListener('scroll', noteSessionActivity, { capture: true, passive: true });
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('pointerdown', noteSessionActivity);
      document.removeEventListener('keydown', noteSessionActivity);
      document.removeEventListener('scroll', noteSessionActivity, true);
    };
  }, [bootstrapError, initialize, isCheckingAuth]);

  if (bootstrapError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">{bootstrapError}</p>
        <button className="rounded-xl bg-violet-600 px-6 py-3 text-white" onClick={() => void initialize()}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* Requires partial token only */}
        <Route
          path="/select-profile"
          element={
            <ProtectedRoute requireFullToken={false}>
              <SelectProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Requires full token — profile setup (no AppLayout, no nav) */}
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute allowIncompleteProfile>
              <ProfileSetupPage />
            </ProtectedRoute>
          }
        />

        {/* Protected app pages — wrapped in AppLayout for nav + background */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/subject/:subjectSlug" element={<SubjectHomePage />} />
          <Route path="/subject/:subjectSlug/course/:courseSlug" element={<CoursePage />} />
          <Route
            path="/subject/:subjectSlug/course/:courseSlug/chat"
            element={<CourseChatPage />}
          />
          <Route
            path="/subject/:subjectSlug/course/:courseSlug/chat/ai-helper"
            element={<CourseChatAiHelperPage />}
          />
          <Route
            path="/subject/:subjectSlug/course/:courseSlug/lesson/:lessonId"
            element={<LessonPlayerPage />}
          />
          <Route
            path="/subject/:subjectSlug/course/:courseSlug/node/:nodeId/quiz/:itemId"
            element={<QuizItemPlayerPage />}
          />
          <Route
            path="/field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug"
            element={<MiniAppPage />}
          />
          <Route
            path="/field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug/term/:termId"
            element={<MiniAppPage />}
          />
          <Route
            path="/field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug/bucket"
            element={<MiniAppPage />}
          />
          <Route
            path="/field/:fieldSlug/subject/:subjectSlug/miniapp/:miniAppSlug/quiz"
            element={<MiniAppPage />}
          />
          <Route
            path="/scribbler"
            element={<Scribbler />}
          />

          {/* Quiz History — global, reached from CoursePage/DictionaryPage buttons */}
          <Route path="/quiz-history" element={<QuizHistoryPage />} />
          <Route path="/quiz-history/play/:quizId" element={<QuizHistoryPlayPage />} />
          <Route path="/quiz-history/:sessionId" element={<QuizHistoryReviewPage />} />

          {/* Content Studio — platform-admin only, gated inside StudioLayout itself */}
          <Route path="/studio" element={<StudioLayout />}>
            <Route path="courses" element={<CoursesListPage />} />
            <Route path="courses/:courseId" element={<CourseDetailPage />} />
            <Route path="nodes/:nodeId" element={<NodeDetailPage />} />
            <Route path="lessons/:lessonId" element={<LessonEditorPage />} />
            <Route path="quizzes/:quizId" element={<QuizEditorPage />} />
            <Route path="questions/new" element={<QuestionEditorPage />} />
            <Route path="questions/:questionId" element={<QuestionEditorPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  </React.StrictMode>
);
