function ServerCostBanner() {
  const progress = 10; // percentage

  return (
    <a
      href="https://ko-fi.com/affytee" // <-- replace with your target link
      target="_blank"
      rel="noopener noreferrer"
      className="block" // ensures proper block-level layout
    >
      <div className="w-full bg-white rounded rounded-lg h-10 overflow-hidden flex items-center relative cursor-pointer hover:opacity-90 transition">
        {/* Progress Fill */}
        <div
          className="bg-emerald-400 h-full"
          style={{ width: `${progress}%` }}
        ></div>

        {/* Left Label */}
        <div className="absolute left-3 flex items-center gap-2 text-black font-semibold">
          <img
            src="/images/kofi-logo.png" // <-- change this to your image path
            alt="Ko-fi Icon"
            className="w-5 h-5 object-contain"
          />
          <span>Server costs for September</span>
        </div>

        {/* Right Label */}
        <span className="absolute right-3 text-black font-semibold">
          {progress}% of Goal
        </span>
      </div>
    </a>
  );
}

export default ServerCostBanner;
