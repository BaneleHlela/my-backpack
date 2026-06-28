// Wraps all post-auth pages with the global background, TopNav, and enrollment bootstrap.
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ASSETS } from '@my-backpack/shared';
import type { AppDispatch, RootState } from '../app/store';
import { fetchEnrolledSubjects } from '../features/enrollment/enrollmentSlice';
import TopNav from '../components/nav/TopNav';

export default function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const { enrolledSubjects } = useSelector((state: RootState) => state.enrollment);

  useEffect(() => {
    if (!enrolledSubjects) {
      void dispatch(fetchEnrolledSubjects());
    }
  }, [dispatch, enrolledSubjects]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${ASSETS.wallpapers.portrait})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
