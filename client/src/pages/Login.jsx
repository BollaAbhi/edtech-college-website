import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { showToast } from '../components/Toast';

const ROLE_REDIRECTS = {
  principal: '/principal/dashboard',
  staff: '/staff/dashboard',
  student: '/student/dashboard',
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isForgot, setIsForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data;

      login(token, user);
      navigate(ROLE_REDIRECTS[user.role] || '/');
    } catch (err) {
      console.error('Exact login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/auth/forgot-password', { email: resetEmail });
      showToast(res.data?.message || 'Password reset link sent!', 'success');
      setIsForgot(false);
      setEmail(resetEmail);
      setPassword('');
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden items-center justify-center">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 px-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
              🎓
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">EdTech</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Welcome back to your learning journey
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Empowering education through technology. Access courses, manage classrooms, and track progress — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-10">
            {['Smart Analytics', 'Live Classes', 'Role-Based Access', 'Secure Auth'].map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 text-sm font-medium text-white/90 bg-white/10 backdrop-blur-sm rounded-full border border-white/10"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-xl">🎓</div>
            <span className="text-2xl font-bold text-white tracking-tight">EdTech</span>
          </div>

          {isForgot ? (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Forgot password</h1>
                <p className="text-slate-400">Enter your email to receive a password reset link</p>
              </div>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Submit */}
                <button
                  id="reset-button"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-slate-500 text-sm">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setError('');
                  }}
                  className="text-violet-400 hover:text-violet-300 font-medium transition-colors focus:outline-none"
                >
                  Back to Login
                </button>
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Sign in</h1>
                <p className="text-slate-400">Enter your credentials to access your account</p>
              </div>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgot(true);
                        setResetEmail(email);
                        setNewPassword('');
                        setError('');
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Submit */}
                <button
                  id="login-button"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-slate-500 text-sm">
                Contact your administrator for account access
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
