// Content Studio shell — gated to platform admins only. Mirrors ProtectedRoute's own rule:
// never make a redirect decision off a profile that hasn't loaded yet. `isLoadingProfile`
// alone isn't enough to detect that — right after login there's a real window where
// `isLoadingProfile` is still false (its initial value) and `activeProfile` is still null,
// because main.tsx's fetchActiveProfile() dispatch hasn't landed yet. Treating "not loaded
// yet" the same as "not an admin" caused a bounce-to-/dashboard that raced the fetch: by the
// time you checked Redux, isPlatformAdmin was already true, but the gate had already fired
// off the stale null. Waiting on `!activeProfile` (not just isLoadingProfile) closes that gap.
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BookOpen, BarChart3, Settings, LayoutDashboard, Loader2 } from 'lucide-react';
import type { RootState } from '../../app/store';

const NAV_ITEMS = [
  { to: '/studio/courses', label: 'Courses', icon: BookOpen, disabled: false },
  { to: '/studio/analytics', label: 'Analytics', icon: BarChart3, disabled: true },
  { to: '/studio/platform', label: 'Platform', icon: Settings, disabled: true },
];

export default function StudioLayout() {
  const { activeProfile, isLoadingProfile } = useSelector((state: RootState) => state.auth);

  if (isLoadingProfile || !activeProfile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }
  if (!activeProfile.isPlatformAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-[calc(100dvh-60px)]">
      <aside className="w-56 flex-shrink-0 bg-white/30 backdrop-blur-sm border-r border-white/40 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 mb-4 text-gray-700">
          <LayoutDashboard className="w-4 h-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wide">Content Studio</h2>
        </div>

        {NAV_ITEMS.map(({ to, label, icon: ItemIcon, disabled }) =>
          disabled ? (
            <div
              key={to}
              title="Coming soon"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 cursor-not-allowed select-none"
            >
              <ItemIcon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
              <span className="ml-auto text-[10px] font-medium bg-white/50 text-gray-400 px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-white/60 text-gray-800 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-white/40'
                }`
              }
            >
              <ItemIcon className="w-4 h-4" />
              {label}
            </NavLink>
          )
        )}
      </aside>

      <main className="flex-1 p-6 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
