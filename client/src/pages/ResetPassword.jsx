import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { showToast } from '../components/Toast';

const ResetPassword = () => {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No password reset token was provided.');
        setVerifying(false);
        return;
      }

      try {
        const res = await api.post('/api/auth/verify-reset-token', { token });
        setEmail(res.data.email || '');
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.message || 'The password reset token is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Complexity check indicators
  const checks = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) return setError('Reset token is missing.');
    if (!isPasswordValid) return setError('Password does not meet the complexity requirements.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/reset-password', { token, newPassword });
      showToast('Password reset successful Please login with new password', 'success');
      navigate('/login');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkItem = (label, met) => (
    <div className="flex items-center gap-2 text-xs transition-colors">
      <span className={`text-base flex-shrink-0 ${met ? 'text-emerald-400' : 'text-slate-600'}`}>
        {met ? '✓' : '○'}
      </span>
      <span className={met ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
    </div>
  );

  if (verifying) {
    return (
      <div className="flex min-h-screen bg-slate-950 items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Verifying password reset token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-700 relative overflow-hidden items-center justify-center">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 px-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
              🎓
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">EdTech</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Reset Account Password
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Ensure your account has a strong password that meets standard complexity rules to keep your information safe.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-xl">🎓</div>
            <span className="text-2xl font-bold text-white tracking-tight">EdTech</span>
          </div>

          {!tokenValid ? (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Invalid link</h1>
                <p className="text-slate-400">The password reset link is invalid or expired</p>
              </div>

              <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="leading-tight">{error || 'Please request a new reset link from the login page.'}</p>
              </div>

              <Link to="/login" className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-medium rounded-xl transition-all flex items-center justify-center shadow-lg">
                Back to Login
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
                <p className="text-slate-400">Reset password for: <span className="text-violet-400 font-medium">{email}</span></p>
              </div>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <p className="leading-tight">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {/* Complexity requirements */}
                <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-2xl space-y-2.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">New Password Requirements</p>
                  {checkItem('At least 8 characters long', checks.minLength)}
                  {checkItem('At least one uppercase letter (A-Z)', checks.uppercase)}
                  {checkItem('At least one lowercase letter (a-z)', checks.lowercase)}
                  {checkItem('At least one number (0-9)', checks.number)}
                  {checkItem('At least one special character (!@#$%^&*)', checks.special)}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isPasswordValid || newPassword !== confirmPassword}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
                >
                  {submitting ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
