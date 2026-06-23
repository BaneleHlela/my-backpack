import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Input from '../components/auth/Input';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import { register, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';

export default function SignupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, isAuthenticated, isCheckingAuth } = useSelector((state: RootState) => state.auth);
  const { isDarkMode } = useSelector((state: RootState) => state.theme);

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isCheckingAuth, isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleRegister = async (e: FormEvent) => {
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
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const result = await dispatch(register({ email, password, displayName }));
    if (register.fulfilled.match(result)) {
      navigate('/verify-email', { state: { email } });
    }
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
        <h2 className="text-[3vh] font-semibold">Create Account</h2>
        <p style={{ lineHeight: '1.1' }} className="text-[2.1vh] pt-2">
          Start your learning journey today!
        </p>
      </div>

      <div>
        <form onSubmit={handleRegister}>
          <div className="flex gap-[1vh]">
            <div className="flex-1">
              <label className="text-[2.3vh] font-medium text-gray-800">First Name</label>
              <Input
                icon={User}
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-[2.3vh] font-medium text-gray-800">Last Name</label>
              <Input
                icon={User}
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <label className="text-[2.3vh] font-medium text-gray-800">Email</label>
          <Input
            icon={Mail}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="text-[2.3vh] font-medium text-gray-800">Password</label>
          <Input
            icon={Lock}
            type="password"
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="text-[2.3vh] font-medium text-gray-800">Confirm Password</label>
          <Input
            icon={Lock}
            type="password"
            placeholder="Confirm password"
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
            {isLoading ? <Loader2 className="w-[3vh] h-[3vh] animate-spin mx-auto" /> : 'Create Account'}
          </motion.button>
        </form>
      </div>

      <div className="flex flex-col my-4">
        <div className="w-full flex flex-row items-center justify-between text-sm font-semibold text-gray-700">
          <span className="h-[.15vh] w-[30%] bg-white/40" />
          Or sign up with
          <span className="h-[.15vh] w-[30%] bg-white/40" />
        </div>
        <SocialLoginButtons />
      </div>

      <div className="px-8 py-4 flex justify-center">
        <p className="text-[1.7vh] text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
