import React, { useState } from 'react';
import { Trophy, Sparkles, Swords, Award } from 'lucide-react';

function BossVictoryScreen({rankings}) {
  // Mock data - this would come from your actual boss defeat data
  const [victoryData] = useState({
    bossName: "Crimson Drake",
    bossLevel: 12,
    bossImage: "/images/bosses/ancient-scholar.png",
    totalDamage: 5000,
    contributors: [
      { userId: "1", displayName: "CleverWarrior973", damage: 2100, level: 12, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=warrior", isMVP: true },
      { userId: "2", displayName: "CleverLearner912", damage: 1450, level: 11, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=learner", isMVP: false },
      { userId: "3", displayName: "BraveFighter88", damage: 890, level: 10, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=fighter", isMVP: false },
      { userId: "4", displayName: "SwordMaster42", damage: 560, level: 9, avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=master", isMVP: false },
    ],
    rewards: {
      xp: 500,
      gold: 250,
      items: ["Dragon Scale", "Rare Gem"]
    }
  });

  const getMedalEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <div>
      {/* Victory Banner */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"></div>
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h2 className="text-3xl font-bold text-yellow-400">VICTORY!</h2>
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        
        {/* Defeated Boss */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-lg bg-slate-900 border-2 border-slate-700 overflow-hidden opacity-60">
              <img 
                src={victoryData.bossImage} 
                alt={victoryData.bossName}
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl rotate-12">❌</span>
            </div>
          </div>
          <div className="text-left">
            <p className="text-lg font-semibold text-slate-300">{victoryData.bossName}</p>
            <p className="text-sm text-slate-400">Level {victoryData.bossLevel} - Defeated</p>
          </div>
        </div>
      </div>

      {/* MVP Highlight */}
      <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* MVP Avatar */}
              <div className="w-16 h-16 rounded-lg border-2 border-yellow-400 overflow-hidden bg-slate-800">
                <img 
                  src={victoryData.contributors[0].avatar} 
                  alt={victoryData.contributors[0].displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
                <Award className="w-4 h-4 text-yellow-900" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-sm tracking-wider">MVP</span>
                <span className="text-2xl">👑</span>
              </div>
              <p className="text-xl font-semibold text-slate-100">
                {victoryData.contributors[0].displayName}
              </p>
              <p className="text-sm text-slate-400">
                Level {victoryData.contributors[0].level}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-red-400">
              {victoryData.contributors[0].damage}
            </p>
            <p className="text-xs text-slate-400">Total Damage</p>
            <p className="text-sm text-yellow-400 mt-1">
              {Math.round((victoryData.contributors[0].damage / victoryData.totalDamage) * 100)}% of total
            </p>
          </div>
        </div>
      </div>

      {/* All Contributors */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-300">Other Contributors</h3>
          </div>
          <span className="text-xs text-slate-500">Final Results</span>
        </div>
        
        <div className="space-y-2 overflow-y-auto flex-1">
          {victoryData.contributors.slice(1).map((contributor, index) => (
            <div 
              key={contributor.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl min-w-[32px] text-center">
                  {getMedalEmoji(index + 1)}
                </div>
                {/* Contributor Avatar */}
                <div className="w-10 h-10 rounded-lg border border-slate-600 overflow-hidden bg-slate-700">
                  <img 
                    src={contributor.avatar} 
                    alt={contributor.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-slate-200">
                    {contributor.displayName}
                  </p>
                  <p className="text-xs text-slate-400">Level {contributor.level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-400">
                  {contributor.damage}
                </p>
                <p className="text-xs text-slate-500">
                  {Math.round((contributor.damage / victoryData.totalDamage) * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    
  );
}

export default BossVictoryScreen;