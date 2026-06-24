import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, BookOpen, Calculator, Wrench } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { ASSETS } from '@my-backpack/shared';
import { logoutAsync } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';
import { useNavigate } from 'react-router-dom';

function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

interface MiniAppCard {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const MINI_APPS: MiniAppCard[] = [
  { id: 'vocab', label: 'Vocabulary', icon: BookOpen, color: 'from-violet-200/60 to-purple-200/60' },
  { id: 'math', label: 'Mathematics', icon: Calculator, color: 'from-blue-200/60 to-cyan-200/60' },
  { id: 'engineering', label: 'Engineering', icon: Wrench, color: 'from-orange-200/60 to-amber-200/60' },
];

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { activeProfile, isLoadingProfile } = useSelector((state: RootState) => state.auth);
  const greeting = useGreeting();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSignOut = () => {
    dispatch(logoutAsync());
  };

  const handleSwitchProfile = () => {
    setDropdownOpen(false);
    navigate('/select-profile');
  };

  if (isLoadingProfile || !activeProfile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${ASSETS.wallpapers.landscape})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${ASSETS.wallpapers.landscape})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Top navigation */}
      <nav className="w-full backdrop-blur-md bg-white/30 border-b border-white/40 px-6 py-3 flex items-center justify-between">
        <img
          src={ASSETS.branding.logo}
          alt="My Backpack"
          className="h-9 object-contain"
        />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-colors"
          >
            {activeProfile.avatarUrl ? (
              <img
                src={activeProfile.avatarUrl}
                alt={activeProfile.displayName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-300 flex items-center justify-center text-sm font-bold text-white">
                {activeProfile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-800">{activeProfile.displayName}</span>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-44 backdrop-blur-xl bg-white/70 border border-white/50 rounded-2xl shadow-xl overflow-hidden z-50"
              >
                <button
                  type="button"
                  onClick={handleSwitchProfile}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-white/60 transition-colors"
                >
                  Switch profile
                </button>
                <hr className="border-white/40" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50/40 transition-colors"
                >
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800">
            Good {greeting}, {activeProfile.displayName}!
          </h1>
          <p className="text-gray-600 mt-1 text-lg">What would you like to learn today?</p>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MINI_APPS.map((app, i) => (
            <motion.button
              key={app.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setToast(`${app.label} — coming soon!`)}
              className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-gradient-to-br ${app.color} backdrop-blur-md border border-white/50 shadow-lg text-gray-800`}
            >
              <app.icon className="w-10 h-10" />
              <span className="text-base font-semibold">{app.label}</span>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 backdrop-blur-xl bg-gray-800/80 text-white rounded-2xl shadow-xl text-sm font-medium z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
