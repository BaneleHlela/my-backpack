import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Input from '../components/auth/Input';
import { resetPassword, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, successMessage } = useSelector((state: RootState) => state.auth);
  const { isDarkMode } = useSelector((state: RootState) => state.theme);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (!token) {
      setLocalError('Invalid reset link — please request a new one.');
      return;
    }
    dispatch(resetPassword({ token, password }));
  };

  const displayedError = localError || error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`max-w-[60vh] ${isDarkMode ? 'bg-gray-800 text-white' : 'backdrop-blur-sm bg-white/20'} rounded-[2vh] w-full h-fit flex flex-col justify-between backdrop-filter backdrop-blur-xl lg:rounded-[1vh] shadow-xl overflow-hidden px-[2vh] py-[4vh]`}
    >
      <div className="my-1">
        <h2 className="text-[3vh] font-semibold">Reset Password</h2>
        <p style={{ lineHeight: '1.1' }} className="text-[2.1vh] pt-2">
          Choose a strong new password for your account.
        </p>
      </div>

      <div>
        {successMessage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-[2vh] py-[3vh]"
          >
            <CheckCircle className="w-[8vh] h-[8vh] text-green-500" />
            <p className="text-[2.2vh] text-center text-gray-700 font-medium">{successMessage}</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="text-[2.3vh] font-medium text-gray-800">New Password</label>
            <Input
              icon={Lock}
              type="password"
              placeholder="New password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="text-[2.3vh] font-medium text-gray-800">Confirm Password</label>
            <Input
              icon={Lock}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {displayedError && (
              <p className="text-red-500 font-semibold mt-2 text-[2vh]">{displayedError}</p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-[1.3vh] bg-white/80 text-gray-900 font-bold rounded-[.5vh] border border-white/60 shadow-sm hover:bg-white/95 transition duration-200 mt-[1vh]"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-[3vh] h-[3vh] animate-spin mx-auto" /> : 'Reset Password'}
            </motion.button>
          </form>
        )}
      </div>

      <div className="px-8 py-4 flex justify-center">
        {successMessage ? (
          <Link to="/login" className="text-[1.7vh] text-blue-600 hover:underline">
            Continue to Sign in
          </Link>
        ) : (
          <p className="text-[1.7vh] text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </motion.div>
  );
}
