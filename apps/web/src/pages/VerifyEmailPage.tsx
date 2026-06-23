import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyEmail, resendVerification, clearError } from '../features/auth/authSlice';
import type { AppDispatch, RootState } from '../app/store';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, successMessage } = useSelector((state: RootState) => state.auth);
  const { isDarkMode } = useSelector((state: RootState) => state.theme);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (token) {
      dispatch(verifyEmail({ token }));
    }
    return () => {
      dispatch(clearError());
    };
  }, [dispatch, token]);

  const handleResend = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    setResendStatus('idle');
    const result = await dispatch(resendVerification({ email }));
    setResendLoading(false);
    setResendStatus(resendVerification.fulfilled.match(result) ? 'success' : 'error');
  };

  const cardClass = `max-w-[60vh] ${isDarkMode ? 'bg-gray-800 text-white' : 'backdrop-blur-sm bg-white/20'} rounded-[2vh] w-full h-fit flex flex-col justify-between backdrop-filter backdrop-blur-xl lg:rounded-[1vh] shadow-xl overflow-hidden px-[2vh] py-[4vh]`;

  // --- Token mode: auto-verify ---
  if (token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cardClass}
      >
        <div className="my-1">
          <h2 className="text-[3vh] font-semibold">Email Verification</h2>
          <p style={{ lineHeight: '1.1' }} className="text-[2.1vh] pt-2">
            {isLoading ? 'Verifying your email address...' : 'Verification complete.'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-[2vh] py-[3vh]">
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-[2vh]">
              <Loader2 className="w-[8vh] h-[8vh] animate-spin text-gray-500" />
              <p className="text-[2.2vh] text-gray-600">Verifying your email...</p>
            </motion.div>
          )}

          {successMessage && !isLoading && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-[2vh]">
              <CheckCircle className="w-[8vh] h-[8vh] text-green-500" />
              <p className="text-[2.2vh] text-center text-gray-700 font-medium">{successMessage}</p>
            </motion.div>
          )}

          {error && !isLoading && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-[2vh]">
              <XCircle className="w-[8vh] h-[8vh] text-red-500" />
              <p className="text-[2.2vh] text-center text-red-500 font-medium">{error}</p>
            </motion.div>
          )}
        </div>

        <div className="px-8 py-4 flex justify-center">
          {(successMessage || error) && !isLoading && (
            <Link to="/login" className="text-[1.7vh] text-blue-600 hover:underline">
              {successMessage ? 'Continue to Sign in' : 'Back to Sign in'}
            </Link>
          )}
        </div>
      </motion.div>
    );
  }

  // --- Pending mode: check your email ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cardClass}
    >
      <div className="my-1">
        <h2 className="text-[3vh] font-semibold">Check your email</h2>
        <p style={{ lineHeight: '1.1' }} className="text-[2.1vh] pt-2">
          We sent a verification link to your inbox.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-[2vh] py-[3vh]">
        <Mail className="w-[8vh] h-[8vh] text-blue-400" />
        {email && (
          <p className="text-[2.2vh] text-center font-medium break-all">{email}</p>
        )}
        <p className="text-[1.9vh] text-center text-gray-600">
          Click the link in the email to verify your account. The link expires in 24 hours.
        </p>

        {resendStatus === 'success' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[1.9vh] text-green-600 font-medium text-center"
          >
            Email sent! Check your inbox.
          </motion.p>
        )}
        {resendStatus === 'error' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[1.9vh] text-red-500 font-medium text-center"
          >
            Failed to resend. Please try again.
          </motion.p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleResend}
          disabled={resendLoading || !email}
          className="flex items-center gap-2 px-[3vh] py-[1.2vh] bg-white/80 text-gray-900 font-semibold rounded-[.5vh] border border-white/60 shadow-sm hover:bg-white/95 transition duration-200 disabled:opacity-50"
        >
          {resendLoading
            ? <Loader2 className="w-[2.2vh] h-[2.2vh] animate-spin" />
            : <RefreshCw className="w-[2.2vh] h-[2.2vh]" />
          }
          Resend verification email
        </motion.button>
      </div>

      <div className="px-8 py-4 flex justify-center">
        <p className="text-[1.7vh] text-gray-600">
          Wrong account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in with a different email
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
