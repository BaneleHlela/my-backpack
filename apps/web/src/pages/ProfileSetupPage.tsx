import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Camera } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ASSETS } from '@my-backpack/shared';
import type { EducationLevel } from '@my-backpack/shared';
import { completeProfileSetup } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';

const SCHOOL_LEVELS: EducationLevel[] = [
  'grade-r', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6',
  'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12',
];
const TERTIARY_LEVELS: EducationLevel[] = [
  'certificate', 'diploma', 'bachelors', 'honours', 'masters', 'phd',
];
const OTHER_LEVELS: EducationLevel[] = ['professional', 'other'];

function formatLevel(level: EducationLevel): string {
  if (level.startsWith('grade-')) {
    const g = level.slice(6);
    return g === 'r' ? 'Grade R' : `Grade ${g}`;
  }
  return level.charAt(0).toUpperCase() + level.slice(1);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

export default function ProfileSetupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { activeProfile, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [displayName, setDisplayName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<EducationLevel | ''>('');
  const [institution, setInstitution] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isChild = activeProfile?.ageGroup === 'child';

  // Pre-fill from active profile and redirect if already set up
  useEffect(() => {
    if (activeProfile?.isSetupComplete) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (activeProfile) {
      setDisplayName(activeProfile.displayName);
      if (activeProfile.education?.currentLevel) {
        setCurrentLevel(activeProfile.education.currentLevel);
      }
    }
  }, [activeProfile, navigate]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!dobDay || !dobMonth || !dobYear) {
      setValidationError('Please enter your date of birth.');
      return;
    }
    if (!currentLevel) {
      setValidationError('Please select your current education level.');
      return;
    }

    const month = MONTHS.indexOf(dobMonth) + 1;
    const dateOfBirth = `${dobYear}-${String(month).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

    const result = await dispatch(
      completeProfileSetup({
        dateOfBirth,
        education: {
          currentLevel: currentLevel as EducationLevel,
          institution: institution.trim() || undefined,
        },
      })
    );

    if (completeProfileSetup.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundImage: `url(${ASSETS.wallpapers.portrait})`, backgroundSize: 'cover' }}>
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: `url(${ASSETS.wallpapers.portrait})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md backdrop-blur-xl bg-white/30 border border-white/40 rounded-3xl shadow-2xl px-8 py-10"
      >
        <div className="mb-6">
          <h1 className={`font-bold text-gray-800 ${isChild ? 'text-3xl' : 'text-2xl'}`}>
            {isChild ? '✏️ Tell us about you!' : 'Complete your profile'}
          </h1>
          <p className={`text-gray-600 mt-1 ${isChild ? 'text-lg' : 'text-sm'}`}>
            {isChild
              ? 'Just a few fun details to get started!'
              : 'A few more details to personalise your experience.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal details section */}
          <div className="space-y-4">
            <h2 className={`font-semibold text-gray-700 ${isChild ? 'text-lg' : 'text-sm uppercase tracking-wide'}`}>
              {isChild ? 'About you' : 'Personal details'}
            </h2>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-white/50 border-2 border-white/60 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : activeProfile.avatarUrl ? (
                  <img src={activeProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-700 font-medium hover:underline"
              >
                Upload photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Display name */}
            <div>
              <label className={`block font-medium text-gray-700 mb-1 ${isChild ? 'text-base' : 'text-sm'}`}>
                {isChild ? 'Your name' : 'Display name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/50 border border-white/60 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Your name"
              />
            </div>

            {/* Date of birth */}
            <div>
              <label className={`block font-medium text-gray-700 mb-1 ${isChild ? 'text-base' : 'text-sm'}`}>
                {isChild ? 'When is your birthday? 🎂' : 'Date of birth'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={dobDay}
                  onChange={(e) => setDobDay(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/50 border border-white/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/50 border border-white/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Month</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/50 border border-white/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Education section */}
          <div className="space-y-4">
            <h2 className={`font-semibold text-gray-700 ${isChild ? 'text-lg' : 'text-sm uppercase tracking-wide'}`}>
              {isChild ? 'School' : 'Education'}
            </h2>

            <div>
              <label className={`block font-medium text-gray-700 mb-1 ${isChild ? 'text-base' : 'text-sm'}`}>
                {isChild ? 'What grade are you in? 📚' : 'Current level'}
              </label>
              <select
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value as EducationLevel)}
                className="w-full px-4 py-2 rounded-xl bg-white/50 border border-white/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Select a level…</option>
                <optgroup label="School">
                  {SCHOOL_LEVELS.map((l) => (
                    <option key={l} value={l}>{formatLevel(l)}</option>
                  ))}
                </optgroup>
                {!isChild && (
                  <>
                    <optgroup label="Tertiary">
                      {TERTIARY_LEVELS.map((l) => (
                        <option key={l} value={l}>{formatLevel(l)}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      {OTHER_LEVELS.map((l) => (
                        <option key={l} value={l}>{formatLevel(l)}</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {!isChild && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="School or university name"
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-white/60 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            )}
          </div>

          {(validationError ?? error) && (
            <p className="text-red-600 font-semibold text-sm">{validationError ?? error}</p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 bg-white/80 text-gray-900 font-bold rounded-xl border border-white/60 shadow-sm hover:bg-white/95 transition duration-200 ${isChild ? 'text-lg' : 'text-base'}`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              isChild ? "Let's go! 🚀" : "Let's go →"
            )}
          </motion.button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Set up later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
