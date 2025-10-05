function ServerCostBanner() {
  const progress = 10; // percentage

  return (
    <a
      href="https://ko-fi.com/affytee"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full my-4"
    >
      <div className="w-full bg-white rounded-lg h-12 overflow-hidden flex items-center relative cursor-pointer hover:opacity-90 transition-opacity shadow-sm">
        {/* Progress Fill */}
        <div
          className="bg-emerald-400 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>

        {/* Content Container */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          {/* Left Label */}
          <div className="flex items-center gap-2">
            <img
              src="/images/kofi-logo.png"
              alt="Ko-fi"
              className="w-5 h-5 object-contain flex-shrink-0"
            />
            <span className="text-black font-semibold text-xs sm:text-sm md:text-base">
              Help keep the adventure alive!
            </span>
          </div>

          {/* Right Label */}
          <span className="text-black font-semibold text-sm md:text-base whitespace-nowrap ml-4">
            {progress}% of Goal
          </span>
        </div>
      </div>
    </a>
  );
}

export default ServerCostBanner;