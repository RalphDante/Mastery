function ServerCostBanner() {
  const progress = 75; // percentage

  return (
      <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex items-center relative">
        {/* Progress Fill */}
        <div
          className="bg-emerald-400 h-full"
          style={{ width: `${progress}%` }}
        ></div>

        {/* Left Label */}
        <div className="absolute left-3 flex items-center gap-2 text-black font-semibold">
          <span className="text-red-500">❤️</span>
          <span>Server costs for September</span>
        </div>

        {/* Right Label */}
        <span className="absolute right-3 text-black font-semibold">
          {progress}% of Goal
        </span>
      </div>
  );
}

export default ServerCostBanner;
