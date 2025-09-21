import React, { useState, useEffect } from 'react';

function Boss() {
  // Mock data - replace with real data from your backend
  const [bossData, setBossData] = useState({
    name: "Crimson Drake",
    currentHP: 2450,
    maxHP: 5000,
    level: 12,
    timeLeft: "2h 34m"
  });

  // Mock party damage data
  const [recentDamage, setRecentDamage] = useState([
    { player: "You", damage: 45, timeAgo: "2m ago" },
    { player: "Sarah", damage: 32, timeAgo: "5m ago" },
    { player: "Mike", damage: 28, timeAgo: "8m ago" }
  ]);

  const healthPercentage = (bossData.currentHP / bossData.maxHP) * 100;
  const isDamaged = healthPercentage < 100;

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      {/* Subtle accent */}
      {/* <div className="absolute top-0 right-0 w-3 h-16 bg-yellow-500 rounded-bl-lg opacity-60"></div> */}
      
      {/* Header */}
      <div className="text-left">
        <h2 className="text-xl font-semibold mb-1 text-slate-100">{bossData.name}</h2>
          
      </div>

      {/* Boss Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-4">
        {/* Boss Avatar */}
        <div className="relative">
          <div className="w-40 h-40 rounded-lg bg-slate-900 border-2 border-slate-700 overflow-hidden">
            <img 
              src="/images/bosses/red-dragon.png" 
              alt="Red Dragon"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback if image doesn't load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              className="w-full h-full bg-red-600 rounded hidden items-center justify-center text-4xl"
              style={{ display: 'none' }}
            >
              🐉
            </div>
          </div>
          <div className="absolute -top-2 -right-2 bg-slate-700 text-yellow-400 text-sm px-2 py-1 rounded-full border border-slate-600">
            Lv.{bossData.level}
          </div>
        </div>

        {/* Boss Name */}
        

        {/* Health Bar */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">HP</span>
            <span className="text-sm text-slate-300">
              {bossData.currentHP.toLocaleString()} / {bossData.maxHP.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                healthPercentage > 60 ? 'bg-red-500' : 
                healthPercentage > 30 ? 'bg-orange-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${healthPercentage}%` }}
            ></div>
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-slate-400">{Math.round(healthPercentage)}% remaining</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Top Contributors</span>
          <span className="text-xs text-slate-500">This battle</span>
        </div>
        <div className="space-y-1 max-h-20 overflow-y-auto">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">🥇</span>
              <span className="text-slate-300">Sarah</span>
            </div>
            <span className="text-red-400 font-medium">342 DMG</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">🥈</span>
              <span className="text-slate-300">You</span>
            </div>
            <span className="text-red-400 font-medium">298 DMG</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-amber-600">🥉</span>
              <span className="text-slate-300">Mike</span>
            </div>
            <span className="text-red-400 font-medium">156 DMG</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">4</span>
              <span className="text-slate-300">Alex</span>
            </div>
            <span className="text-red-400 font-medium">89 DMG</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">5</span>
              <span className="text-slate-300">Lisa</span>
            </div>
            <span className="text-red-400 font-medium">45 DMG</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">6</span>
              <span className="text-slate-300">Tom</span>
            </div>
            <span className="text-red-400 font-medium">12 DMG</span>
          </div>
        </div>
      </div>

      {/* Recent Damage Feed */}
      {/* <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
        <p className="text-sm text-slate-400 mb-2">Recent attacks:</p>
        <div className="space-y-1 max-h-16 overflow-y-auto">
          {recentDamage.map((attack, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="text-slate-300">{attack.player}</span>
              <div className="flex items-center space-x-2">
                <span className="text-red-400 font-medium">-{attack.damage}</span>
                <span className="text-slate-500">{attack.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}

export default Boss;