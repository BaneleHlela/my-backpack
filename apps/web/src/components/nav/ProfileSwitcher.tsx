// Avatar dropdown for switching profiles or signing out.
import { useRef, useState, useEffect } from 'react';
import { ChevronDown, Lock, Plus, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { logoutAsync, selectProfile } from '../../features/auth/authSlice';
import PinModal from '../auth/PinModal';
import type { AgeGroup } from '@my-backpack/shared';

function avatarUrl(displayName: string, ageGroup: AgeGroup) {
  const style = ageGroup === 'child' ? 'fun-emoji' : 'adventurer';
  return `https://api.dicebear.com/8.x/${style}/svg?seed=${encodeURIComponent(displayName)}`;
}

export default function ProfileSwitcher() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { activeProfile, profiles, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );
  const [open, setOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<{ id: string; name: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!activeProfile) return null;

  const otherProfiles = profiles.filter((p) => p.id !== activeProfile._id);

  const handleSwitch = (profileId: string, hasPin: boolean, displayName: string) => {
    if (hasPin) {
      setPinTarget({ id: profileId, name: displayName });
      setOpen(false);
    } else {
      void dispatch(selectProfile({ profileId })).then(() => navigate('/dashboard'));
      setOpen(false);
    }
  };

  const handlePinSubmit = (pin: string) => {
    if (!pinTarget) return;
    void dispatch(selectProfile({ profileId: pinTarget.id, pin })).then((res) => {
      if (selectProfile.fulfilled.match(res)) {
        setPinTarget(null);
        navigate('/dashboard');
      }
    });
  };

  const src =
    activeProfile.avatarUrl ?? avatarUrl(activeProfile.displayName, activeProfile.ageGroup);

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/40 border border-white/50 hover:bg-white/60 transition-colors"
        >
          <img
            src={src}
            alt={activeProfile.displayName}
            className="w-8 h-8 rounded-full object-cover bg-white"
          />
          <span className="text-sm font-semibold text-gray-800 hidden sm:inline max-w-[100px] truncate">
            {activeProfile.displayName}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 min-w-[200px] backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl shadow-xl overflow-hidden z-50"
            >
              {/* Current profile — not clickable */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white/30">
                <img
                  src={src}
                  alt={activeProfile.displayName}
                  className="w-8 h-8 rounded-full object-cover bg-white"
                />
                <span className="text-sm font-semibold text-gray-800">
                  {activeProfile.displayName}
                </span>
              </div>

              {otherProfiles.length > 0 && (
                <>
                  <hr className="border-white/40" />
                  {otherProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSwitch(p.id, !!p.hasPin, p.displayName)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/50 transition-colors"
                    >
                      <img
                        src={avatarUrl(p.displayName, p.ageGroup)}
                        alt={p.displayName}
                        className="w-8 h-8 rounded-full object-cover bg-white"
                      />
                      <span className="text-sm text-gray-800 flex-1 text-left">
                        {p.displayName}
                      </span>
                      {p.hasPin && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  ))}
                </>
              )}

              <hr className="border-white/40" />

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/select-profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/50 transition-colors text-sm text-gray-700"
              >
                <Plus className="w-4 h-4" />
                Add Profile
              </button>

              <hr className="border-white/40" />

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void dispatch(logoutAsync());
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50/60 transition-colors text-sm text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {pinTarget && (
        <PinModal
          profileName={pinTarget.name}
          isLoading={isLoading}
          error={error}
          onSubmit={handlePinSubmit}
          onClose={() => setPinTarget(null)}
        />
      )}
    </>
  );
}
