import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative">
          {/* Decorative glowing background */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 blur-2xl opacity-20 w-48 h-48 mx-auto left-0 right-0"></div>
          
          <div className="relative text-[120px] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-indigo-500 tracking-tighter leading-none select-none">
            404
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Oops! Page not found</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            The page you are looking for doesn't exist, was removed, or is restricted to other roles.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl text-sm transition-all duration-200 shadow-lg shadow-violet-500/25"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
