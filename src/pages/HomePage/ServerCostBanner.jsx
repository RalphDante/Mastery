function ServerCostBanner() {
  const progress = 75; // percentage

  return (
    <div className="w-full bg-gray-200 rounded h-10 overflow-hidden flex items-center relative">
      {/* Progress Fill */}
      <div
        className="bg-emerald-400 h-full"
        style={{ width: `${progress}%` }}
      ></div>

      {/* Left Label */}
      <div className="absolute left-3 flex items-center gap-2 text-black font-semibold">
        <img
          src="/images/kofi-logo.png" // <-- change this to your image path
          alt="Heart Icon"
          className="w-5 h-5 object-contain" // adjust size as needed
        />
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
