import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

const Navbar = () => {
  const { user } = useAuth();

  // Theme state: defaults to dark mode (isDark = true)
  const [isDark, setIsDark] = useState(
    localStorage.getItem('theme') !== 'light'
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="flex items-center justify-between px-6 lg:px-8 py-4">
        {/* Left side: Hamburger (mobile) + Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
            className="lg:hidden p-2 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
            title="Toggle Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* College logo placeholder */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-base shadow-sm">
              🎓
            </div>
            <div>
              <h2 className="text-sm lg:text-base font-bold text-white leading-tight">EdTech Institute</h2>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Staff Management Portal</p>
            </div>
          </div>
        </div>

        {/* Right side: Actions & User */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 rounded-xl bg-slate-800/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <span className="text-base">🌙</span>
            ) : (
              <span className="text-base">☀️</span>
            )}
          </button>

          {/* Notification bell */}
          <NotificationBell />

          {/* User info */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-cyan-500/20 select-none">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">{user?.name || 'Staff'}</p>
              <p className="text-xs text-slate-500 capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
