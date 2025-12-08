// components/SessionCompleteScreen.jsx
import React from 'react';

export default function SessionCompleteScreen({ 
  selectedDuration, 
  rewards, 
  onReset 
}) {
  return (
    <>
      <div className="text-center flex-1 flex flex-col justify-center items-center space-y-1">
        <div>
          <img 
            src="/images/sword-x.png"
            alt="sword-x image"
            className="w-24 h-24 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-green-400">Session Complete!</h2>
        <p className="text-slate-300">
          Great work on your {selectedDuration} minute session
        </p>
        
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg w-full max-w-xs">
          <p className="text-sm text-slate-400 mb-3">Rewards Earned:</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Experience</span>
              <span className="text-yellow-500 font-bold">+{rewards.xp} XP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Health</span>
              <span className="text-red-500 font-bold">+{rewards.health} HP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Mana</span>
              <span className="text-blue-500 font-bold">+{rewards.mana} MANA</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Boss Damage</span>
              <span className="text-red-400 font-bold">{rewards.damage} DMG</span>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onReset} 
        className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-lg"
      >
        Take a break
      </button>
    </>
  );
}