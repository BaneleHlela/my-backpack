import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, LogOut, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { ASSETS } from '@my-backpack/shared';
import type { ProfileSummary } from '@my-backpack/shared';
import ProfileCard from '../components/auth/ProfileCard';
import PinModal from '../components/auth/PinModal';
import { selectProfile, logoutAsync, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';

export default function SelectProfilePage() {
  const [pendingProfile, setPendingProfile] = useState<ProfileSummary | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { profiles, isLoading, error } = useSelector((state: RootState) => state.auth);
  const { isDarkMode } = useSelector((state: RootState) => state.theme);

  const handleProfileClick = (profile: ProfileSummary) => {
    dispatch(clearError());
    if (profile.hasPin) {
      setPendingProfile(profile);
      setPinError(null);
    } else {
      dispatch(selectProfile({ profileId: profile.id }));
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingProfile) return;
    setPinError(null);
    const result = await dispatch(selectProfile({ profileId: pendingProfile.id, pin }));
    if (selectProfile.rejected.match(result)) {
      setPinError(result.payload as string);
    } else {
      setPendingProfile(null);
    }
  };

  const handleLogout = () => {
    dispatch(logoutAsync());
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-[4vh]"
      style={{
        backgroundImage: `url(${ASSETS.wallpapers.landscape})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          isDarkMode ? 'bg-gray-800/90 text-white' : 'bg-white/90'
        } backdrop-blur-sm rounded-[1.5vh] shadow-xl p-[4vh] w-full max-w-[80vh]`}
      >
        <div className="flex items-center justify-between mb-[3vh]">
          <div>
            <h1 className="text-[3vh] font-bold text-gray-800">Who's learning today?</h1>
            <p className="text-[2vh] text-gray-500 mt-[0.5vh]">Select a profile to continue</p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center gap-[0.8vh] text-[1.9vh] text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut className="w-[2vh] h-[2vh]" />
            Sign out
          </motion.button>
        </div>

        {error && (
          <p className="text-red-500 text-[2vh] mb-[2vh] text-center">{error}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[2vh]">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onClick={handleProfileClick}
            />
          ))}

          {profiles.length < 6 && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-[1vh] p-[2vh] rounded-[1vh] border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-400 hover:text-gray-600 transition-colors w-full min-h-[15vh]"
            >
              <PlusCircle className="w-[5vh] h-[5vh]" />
              <span className="text-[1.8vh] font-medium">Add Profile</span>
            </motion.button>
          )}
        </div>

        {isLoading && !pendingProfile && (
          <div className="flex justify-center mt-[2vh]">
            <Loader2 className="w-[4vh] h-[4vh] animate-spin text-gray-400" />
          </div>
        )}
      </motion.div>

      {pendingProfile && (
        <PinModal
          profileName={pendingProfile.displayName}
          isLoading={isLoading}
          error={pinError}
          onSubmit={handlePinSubmit}
          onClose={() => {
            setPendingProfile(null);
            setPinError(null);
          }}
        />
      )}
    </div>
  );
}
