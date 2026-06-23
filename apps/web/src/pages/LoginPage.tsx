import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ASSETS } from '@my-backpack/shared';
import Input from '../components/auth/Input';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import { login, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectFromQuery = queryParams.get('redirect');
  const fromState = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  const from = fromState ?? redirectFromQuery ?? undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, isAuthenticated, isCheckingAuth } = useSelector((state: RootState) => state.auth);
  const { isDarkMode } = useSelector((state: RootState) => state.theme);

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated) {
      navigate(from && from !== '/login' && from !== '/signup' ? from : '/', { replace: true });
    }
  }, [isCheckingAuth, isAuthenticated, from, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate('/select-profile', { replace: true });
    } else if (login.rejected.match(result)) {
      const payload = result.payload as { needsVerification?: boolean; email?: string } | string;
      if (typeof payload === 'object' && payload?.needsVerification) {
        navigate('/verify-email', { state: { email: payload.email } });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`max-w-[60vh] ${isDarkMode ? 'bg-gray-800 text-white' : 'backdrop-blur-sm bg-white/20'} rounded-[2vh] w-full h-fit flex flex-col justify-between backdrop-filter backdrop-blur-xl lg:rounded-[1vh] shadow-xl overflow-hidden px-[2vh] py-[4vh]`}
    >


      <div className='my-1'>
        <h2 className="text-[3vh] font-semibold">Welcome Back!</h2>
        <p style={{ lineHeight: '1.1' }} className="text-[2.1vh] pt-2">
          It's a great pleasure to have you. Let's keep learning!
        </p>
      </div>

      <div>
        <form onSubmit={handleLogin}>
          <label className="text-[2.3vh] font-medium text-gray-800">email</label>
          <Input
            icon={Mail}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="text-[2.3vh] font-medium text-gray-800">password</label>
          <Input
            icon={Lock}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex flex-col items-end mb-[2vh]">
            <Link to="/forgot-password" className="text-end text-sm font-semibold text-blue-600 hover:underline">
              forgot password?
            </Link>
          </div>
          {error && <p className="text-red-500 font-semibold mt-2 text-[2vh]">{error}</p>}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-[1.3vh] bg-white/80 text-gray-900 font-bold rounded-[.5vh] border border-white/60 shadow-sm hover:bg-white/95 focus:ring-2 focus:ring-offset-2 transition duration-200"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-[3vh] h-[3vh] animate-spin mx-auto" /> : 'Sign in'}
          </motion.button>
        </form>
      </div>

      <div className="flex flex-col my-4">
        <div className="w-full flex flex-row items-center justify-between text-sm font-semibold text-gray-700">
          <span className="h-[.15vh] w-[30%] bg-white/40" />
          Or sign in with
          <span className="h-[.15vh] w-[30%] bg-white/40" />
        </div>
        <SocialLoginButtons />
      </div>

      <div className="px-8 py-4 flex justify-center">
        <p className="text-[1.7vh] text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
