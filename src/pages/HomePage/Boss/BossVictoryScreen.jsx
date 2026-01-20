import React, { useState } from 'react';
import { Trophy, Sparkles, Swords, Award } from 'lucide-react';
import { bosses } from '../../../utils/bossUtils';
import BossSpawnCountdown from './BossSpawnCountDown';
import { usePartyContext } from '../../../contexts/PartyContext';
import { getAvatarPath } from '../../../configs/avatarConfig';

function BossVictoryScreen({ collapsible = false }) {
  const { partyProfile, partyMembers } = usePartyContext();
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const lastBossResults = partyProfile?.lastBossResults;

  // Map boss number to boss data
  const bossesData = [
    { bossNumber: 1, name: "Amnesiac Ooze", image: "/images/bosses/amnesiac-ooze.png" },
    { bossNumber: 2, name: "Conundrum Crawler", image: "/images/bosses/conundrum-crawler.png" },
    { bossNumber: 3, name: "Mnemonic Dragon", image: "/images/bosses/mnemonic-dragon.png" },
    { bossNumber: 4, name: "Ancient Scholar", image: "/images/bosses/ancient-scholar.png" }
  ];

  // Build victory data from lastBossResults
  const victoryData = lastBossResults ? {
    bossName: bossesData[lastBossResults.bossNumber - 1]?.name || "Unknown Boss",
    bossLevel: lastBossResults.bossNumber,
    bossImage: bossesData[lastBossResults.bossNumber - 1]?.image || "/images/bosses/ancient-scholar.png",
    totalDamage: lastBossResults.rankings.reduce((sum, r) => sum + r.damage, 0),
    contributors: lastBossResults.rankings.map((ranking, index) => {
      const member = partyMembers[ranking.userId];
      return {
        userId: ranking.userId,
        displayName: ranking.displayName,
        damage: ranking.damage,
        level: member?.level || 1,
        avatar: member?.avatar || null,
        isMVP: index === 0
      };
    }),
    fightDuration: lastBossResults.fightDuration
  } : null;

  if (!victoryData) {
    return <div className="text-center text-slate-400 p-3">No boss victory data available</div>;
  }

  const getMedalEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <div className="relative border border-slate-500/40 rounded-lg p-3 md:p-4 lg:p-6 bg-slate-900/60 overflow-hidden">
      {/* Victory glow effect */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
      
      {/* Boss Display - Same layout as CurrentBossFight */}
      <div className="flex lg:flex-col items-center lg:items-center gap-3 md:gap-4 lg:gap-2">
        
        {/* Boss Avatar - Same sizing as CurrentBossFight */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 md:w-24 md:h-24 lg:w-40 lg:h-40 rounded-lg bg-slate-900 border-2 border-yellow-500/30 overflow-hidden opacity-70 grayscale">
            <img 
              src={victoryData.bossImage} 
              alt={victoryData.bossName}
              className="w-full h-full object-contain"
            />
          </div>
          
          {/* Defeated X */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl md:text-2xl lg:text-3xl">❌</span>
          </div>
          
          {/* Victory badge */}
          <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 lg:-top-2 lg:-right-2 bg-yellow-500 text-slate-900 text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-yellow-600 uppercase">
            Victory
          </div>
        </div>
        
        {/* Boss Info - Flex-1 on mobile/tablet to take remaining space */}
        <div className="flex-1 lg:flex-none lg:w-full">
          
          
          {/* Boss name */}
          <p className="text-xs md:text-sm lg:text-base text-slate-300 mb-2 lg:text-center">
            {victoryData.bossName} - Defeated
          </p>
          
          {/* Countdown - compact */}
          <div className="w-full lg:max-w-xs lg:mx-auto">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
              <BossSpawnCountdown nextBossSpawnsAt={partyProfile?.nextBossSpawnsAt} />
            </div>
          </div>
        </div>
      </div>

      {/* Battle Results Section */}
      <div className="bg-slate-900 p-2 md:p-3 border border-slate-900 rounded-lg mt-3 md:mt-4">
        {/* Collapse button - only on mobile/tablet */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden w-full flex items-center justify-between text-xs md:text-sm text-yellow-400 hover:text-yellow-300"
        >
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3" />
            <span>Battle Results</span>
          </div>
          <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {/* Desktop header - always visible */}
        <div className="hidden lg:flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">Battle Results</span>
          </div>
          <span className="text-xs text-slate-500">Final</span>
        </div>

        {/* Results content - collapsed on mobile/tablet unless expanded */}
        <div className={`${!isExpanded ? 'hidden lg:block' : 'block'} space-y-2 max-h-40 md:max-h-48 lg:max-h-[200px] overflow-y-auto mt-2`}>
          {victoryData.contributors.length > 0 && (
            <>
              {/* MVP Highlight */}
              <div className="bg-gradient-to-r from-yellow-600/80 to-yellow-500/80 rounded-lg p-2 border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  {/* MVP Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border-2 border-yellow-300 overflow-hidden bg-slate-800">
                      {victoryData.contributors[0].avatar ? (
                        <img 
                          src={getAvatarPath(victoryData.contributors[0].avatar)} 
                          alt={victoryData.contributors[0].displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs bg-slate-600">
                          {victoryData.contributors[0].displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 bg-yellow-300 rounded-full p-0.5">
                      <Award className="w-2 h-2 md:w-2.5 md:h-2.5 text-yellow-900" />
                    </div>
                  </div>

                  {/* MVP Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="bg-slate-900 text-yellow-400 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded">
                        MVP
                      </span>
                    </div>
                    <p className="text-xs md:text-sm font-bold text-white truncate">
                      {victoryData.contributors[0].displayName}
                    </p>
                  </div>

                  {/* Damage */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm md:text-base font-bold text-slate-900">
                      {victoryData.contributors[0].damage}
                    </p>
                    <p className="text-[8px] md:text-[9px] text-slate-800">DMG</p>
                  </div>
                </div>
              </div>

              {/* Other Contributors */}
              {victoryData.contributors.length > 1 && (
                <div className="space-y-1">
                  {victoryData.contributors.slice(1, collapsible ? 4 : 9).map((contributor, index) => {
                    const percentage = (contributor.damage / victoryData.totalDamage) * 100;
                    
                    return (
                      <div key={contributor.userId} className="relative">
                        <div className="w-full bg-slate-800 rounded h-6 md:h-7 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              index === 0 ? 'bg-slate-400/40' :
                              index === 1 ? 'bg-amber-600/40' :
                              'bg-slate-600/40'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs md:text-sm">
                              {getMedalEmoji(index + 1) || `${index + 2}`}
                            </span>
                            <span className="text-[10px] md:text-xs font-medium truncate max-w-[80px] md:max-w-[100px] lg:max-w-[120px] text-slate-200">
                              {contributor.displayName}
                            </span>
                          </div>
                          <span className="text-orange-400 font-bold text-[10px] md:text-xs">
                            {contributor.damage}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BossVictoryScreen;