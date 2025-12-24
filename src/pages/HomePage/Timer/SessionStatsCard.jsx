import React from 'react';
import { Trophy } from 'lucide-react';

function SessionStatsCard({ 
  rewards, 
  selectedDuration, 
  isPro, 
  hasActiveBooster,
  onProClick 
}) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-xs">
      {/* Pro Banner at top */}
      {!isPro && !hasActiveBooster && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/30 px-3 py-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-300 text-xs">
              Feeling competitive?{' '}
              <button 
                onClick={onProClick}
                className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-dotted"
              >
                Try Pro
              </button>
            </span>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-0.5">
            2x XP · Climb faster
          </p>
        </div>
      )}
      
      {/* Earnings - with small /min indicator */}
      <div className="p-3">
        <div className="flex justify-between items-center text-sm">
          <div className="flex flex-col items-center">
            <span className="text-yellow-500 font-medium">
              {Math.round(rewards.xp / selectedDuration)}
            </span>
            <span className="text-slate-400 text-[10px]">XP/min</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-blue-500 font-medium">
              {Math.round(rewards.mana / selectedDuration)}
            </span>
            <span className="text-slate-400 text-[10px]">MP/min</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400 font-medium">
              {Math.round(rewards.health / selectedDuration)}
            </span>
            <span className="text-slate-400 text-[10px]">HP/min</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-red-400 font-medium">
              {Math.round(rewards.damage / selectedDuration)}
            </span>
            <span className="text-slate-400 text-[10px]">DMG/min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionStatsCard;