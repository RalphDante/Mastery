import React, { useState } from 'react';
import { Trophy, Sparkles, Swords, Award } from 'lucide-react';
import { bosses } from '../../../utils/bossUtils';
import BossSpawnCountdown from './BossSpawnCountDown';
import { usePartyContext } from '../../../contexts/PartyContext';

function BossVictoryScreen({rankings}) {
  const {partyProfile, partyMembers} = usePartyContext();

  const lastBossResults = partyProfile?.lastBossResults;

  // Map boss number to boss data
  const bosses = [
    { bossNumber: 1, name: "Amnesiac Ooze", image: "/images/bosses/amnesiac-ooze.png" },
    { bossNumber: 2, name: "Conundrum Crawler", image: "/images/bosses/conundrum-crawler.png" },
    { bossNumber: 3, name: "Mnemonic Dragon", image: "/images/bosses/mnemonic-dragon.png" },
    { bossNumber: 4, name: "Ancient Scholar", image: "/images/bosses/ancient-scholar.png" }
  ];

  // Build victory data from lastBossResults
  const victoryData = lastBossResults ? {
    bossName: bosses[lastBossResults.bossNumber - 1]?.name || "Unknown Boss",
    bossLevel: lastBossResults.bossNumber,
    bossImage: bosses[lastBossResults.bossNumber - 1]?.image || "/images/bosses/ancient-scholar.png",
    totalDamage: lastBossResults.rankings.reduce((sum, r) => sum + r.damage, 0),
    contributors: lastBossResults.rankings.map((ranking, index) => {
      const member = partyMembers[ranking.userId];
      return {
        userId: ranking.userId,
        displayName: ranking.displayName,
        damage: ranking.damage,
        level: member?.level || 1,
        avatar: member?.avatar ? member.avatar : `https://api.dicebear.com/7.x/pixel-art/svg?seed=${ranking.displayName}`,
        isMVP: index === 0
      };
    }),
    fightDuration: lastBossResults.fightDuration
  } : null;

  if (!victoryData) {
    return <div className="text-center text-slate-400">No boss victory data available</div>;
  }

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
            <p className="text-base sm:text-xl font-semibold text-slate-300">{victoryData.bossName}</p>
            <p className="text-xs sm:text-smtext-sm text-slate-400">Level {victoryData.bossLevel} - Defeated</p>
            
          </div>
          <BossSpawnCountdown />
        </div>
        
      </div>


      {/* MVP Highlight */}
      <div className="bg-yellow-600 rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              {/* MVP Avatar */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border-2 border-yellow-400 overflow-hidden bg-slate-800">
                {victoryData.contributors[0].avatar === 'knight-idle' 
                  ? (<div className="knight-idle" 
                      style={{ 
                        transform: 'scale(1.5)', 
                        imageRendering: 'pixelated',
                        position: 'relative',
                        top: '-10px',      // Move down
                        left: '-20px' }}
                      >
                    </div>)
                  : <img 
                  src={`/images/avatars/${victoryData.contributors[0].avatar}.png`} 
                  alt={victoryData.contributors[0].displayName}
                  className="w-full h-full object-cover"
                />
                }
                
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-yellow-400 rounded-full p-1">
                <Award className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-900" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-orange-600 text-white font-mono text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 border-2 border-orange-800 shadow-[2px_2px_0px_#000]">
                  MVP
                </span>
              </div>
              <p className="text-base sm:text-xl font-semibold text-slate-100 truncate">
                {victoryData.contributors[0].displayName}
              </p>
              <p className="text-xs sm:text-sm text-slate-300">
                Level {victoryData.contributors[0].level}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl sm:text-3xl font-bold text-red-600 leading-tight">
              {victoryData.contributors[0].damage.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-300">Damage</p>
            <p className="text-xs sm:text-sm text-red-700 mt-0.5 sm:mt-1">
              {Math.round((victoryData.contributors[0].damage / victoryData.totalDamage) * 100)}%
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
                    src={`/images/avatars/${contributor.avatar}.png`} 
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