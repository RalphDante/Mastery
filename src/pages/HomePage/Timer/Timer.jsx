import React, { useState, useEffect } from 'react';

function Timer() {
  const [selectedDuration, setSelectedDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const durations = [
    { label: '15 min', value: 15, damage: 30, xp: 25 },
    { label: '25 min', value: 25, damage: 50, xp: 40 },
    { label: '45 min', value: 45, damage: 90, xp: 75 },
    { label: '60 min', value: 60, damage: 120, xp: 100 }
  ];

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Timer completed!
      setIsRunning(false);
      setIsSessionActive(false);
      // Here you would trigger notifications, XP gain, etc.
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setIsRunning(true);
    setIsSessionActive(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsSessionActive(false);
    setTimeLeft(selectedDuration * 60);
  };

  const selectDuration = (duration) => {
    if (!isSessionActive) {
      setSelectedDuration(duration);
      setTimeLeft(duration * 60);
    }
  };

  const getCurrentRewards = () => {
    const current = durations.find(d => d.value === selectedDuration);
    return current || durations[1];
  };

  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      {/* Subtle accent */}
      
      {!isSessionActive ? (
        /* Timer Setup */
        <>
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-1 text-slate-100">⚔️ Study Timer</h2>
            <p className="text-slate-400 text-sm">Choose your battle session</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-4">
            {/* Duration Selection */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  onClick={() => selectDuration(duration.value)}
                  className={`p-3 rounded-lg transition-all font-medium ${
                    selectedDuration === duration.value
                      ? 'bg-slate-700 text-slate-100 border border-slate-600'
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {duration.label}
                </button>
              ))}
            </div>

            {/* Reward Preview */}
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Session rewards:</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">+{getCurrentRewards().xp}</span>
                  <span className="text-slate-400 text-xs">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{getCurrentRewards().damage}</span>
                  <span className="text-slate-400 text-xs">DMG</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={startTimer}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Start Session
          </button>
        </>
      ) : (
        /* Active Timer */
        <>
          <div className="text-left">
            <h2 className="text-lg font-semibold mb-1 text-slate-100">Session Active</h2>
            <p className="text-slate-400 text-sm">Stay focused to maximize rewards</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            {/* Timer Display */}
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-100">{formatTime(timeLeft)}</div>
                  <div className="text-slate-400 text-xs mt-1">{Math.round(progress)}%</div>
                </div>
              </div>
              {/* Progress ring */}
              <svg className="absolute inset-0 w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="transparent"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="#ef4444"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
            </div>

            {/* Live Stats */}
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg w-full max-w-xs">
              <p className="text-sm text-slate-400 mb-2 text-center">Earning per minute:</p>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">+{Math.round(getCurrentRewards().xp / selectedDuration)}</span>
                  <span className="text-slate-400">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{Math.round(getCurrentRewards().damage / selectedDuration)}</span>
                  <span className="text-slate-400">DMG</span>
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={isRunning ? pauseTimer : startTimer}
              className={`flex-1 font-medium py-3 rounded-lg transition-colors ${
                isRunning 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={resetTimer}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Timer;