import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { ProfileSummary } from '@my-backpack/shared';

const AGE_GROUP_STYLES: Record<string, string> = {
  child: 'bg-yellow-100 text-yellow-700',
  teen: 'bg-purple-100 text-purple-700',
  adult: 'bg-blue-100 text-blue-700',
};

interface ProfileCardProps {
  profile: ProfileSummary;
  onClick: (profile: ProfileSummary) => void;
}

export default function ProfileCard({ profile, onClick }: ProfileCardProps) {
  const initials = profile.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.button
      type="button"
      onClick={() => onClick(profile)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex flex-col items-center gap-[1vh] p-[2vh] rounded-[1vh] bg-white shadow-md hover:shadow-lg transition-shadow w-full focus:outline-none focus:ring-2 focus:ring-gray-300"
    >
      <div className="relative">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="w-[8vh] h-[8vh] rounded-full object-cover"
          />
        ) : (
          <div className="w-[8vh] h-[8vh] rounded-full bg-gray-200 flex items-center justify-center text-[2.5vh] font-semibold text-gray-600">
            {initials}
          </div>
        )}
        {profile.hasPin && (
          <div className="absolute bottom-0 right-0 bg-gray-700 rounded-full p-[0.5vh]">
            <Lock className="w-[1.5vh] h-[1.5vh] text-white" />
          </div>
        )}
      </div>
      <span className="text-[2vh] font-medium text-gray-800 truncate w-full text-center">
        {profile.displayName}
      </span>
      <span
        className={`text-[1.6vh] px-[1vh] py-[0.3vh] rounded-full capitalize ${
          AGE_GROUP_STYLES[profile.ageGroup] ?? 'bg-gray-100 text-gray-700'
        }`}
      >
        {profile.ageGroup}
      </span>
    </motion.button>
  );
}
