import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-slate-400 mb-8">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <Link
          to="/login"
          className="inline-flex px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
