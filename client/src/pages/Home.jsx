const Home = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          🎓 EdTech
        </h1>
        <p className="text-xl text-white/80 mb-8">
          Your modern learning platform
        </p>
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-white text-sm font-medium">
            Setup complete — ready to build
          </span>
        </div>
      </div>
    </div>
  );
};

export default Home;
