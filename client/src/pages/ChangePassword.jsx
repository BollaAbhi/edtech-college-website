import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { showToast } from '../components/Toast';

const ChangePassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt to prefill email from expired session if redirected
    const prefilled = localStorage.getItem('expired_email');
    if (prefilled) {
      setEmail(prefilled);
      localStorage.removeItem('expired_email');
    }
  }, []);

  // Real-time validations
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

    if (!email || !newPassword || !confirmPassword) {
      return setError('All fields are required.');
    }

    if (!isPasswordValid) {
      return setError('Password does not meet all complexity requirements.');
    }

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', { email, newPassword });
      showToast(res.data?.message || 'Password changed successfully! Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-700 relative overflow-hidden items-center justify-center">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 px-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
              🎓
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">EdTech</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Security First
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Update your password periodically to keep your student, staff, or administrative records secure.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-xl">🎓</div>
            <span className="text-2xl font-bold text-white tracking-tight">EdTech</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Change password</h1>
            <p className="text-slate-400">Enforce strict account security rules</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

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

            {/* Checklist */}
            <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-2xl space-y-2.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password Requirements</p>
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
              disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Remembered your password?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold underline decoration-violet-500/30 underline-offset-4 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
