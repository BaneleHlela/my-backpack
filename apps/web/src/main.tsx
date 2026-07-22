import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { store } from './app/store';
import type { AppDispatch } from './app/store';
import { injectStore } from './lib/axios';
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
import LessonPlayerPage from './pages/lesson/LessonPlayerPage';
import QuizItemPlayerPage from './pages/lesson/QuizItemPlayerPage';
import MiniAppPage from './pages/miniapp/MiniAppPage';

import './index.css';

injectStore(store);

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const init = async () => {
      const result = await dispatch(checkAuth());
      if (checkAuth.fulfilled.match(result) && result.payload.data.accessToken) {
        dispatch(fetchActiveProfile());
      }
    };
    void init();
  }, [dispatch]);

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
