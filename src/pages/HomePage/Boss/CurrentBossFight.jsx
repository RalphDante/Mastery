import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { bosses } from '../../../utils/bossUtils';
import BossVictoryScreen from './BossVictoryScreen';
import { usePartyContext } from '../../../contexts/PartyContext';

// ✅ Define difficulty styles in one place
const DIFFICULTY_STYLES = {
  easy: {
    text: 'text-green-500',
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    badge: 'bg-green-600'
  },
  medium: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    badge: 'bg-yellow-600'
  },
  hard: {
    text: 'text-orange-500',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/50',
    badge: 'bg-orange-600'
  },
  legendary: {
    text: 'text-purple-500',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    badge: 'bg-purple-600'
  }
};

function CurrentBossFight({collapsible = false}) {
  const {partyProfile, partyMembers} = usePartyContext();
  const {user} = useAuthContext();
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const bossNumber = partyProfile?.currentBoss.bossNumber;
  const bossHealth = partyProfile?.currentBoss.currentHealth;
  const bossMaxHealth = partyProfile?.currentBoss.maxHealth;

  const currentBoss = bosses.find(b => b.bossNumber === bossNumber);
  const bossImage = currentBoss?.image;
  const bossName = currentBoss?.name;
  const bossDifficulty = currentBoss?.difficulty || 'easy';
  
  // ✅ Get difficulty styles
  const difficultyStyle = DIFFICULTY_STYLES[bossDifficulty] || DIFFICULTY_STYLES.easy;

  const getMedal = (position) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return null;
  };

  const topContributors = React.useMemo(() => {
    if (!partyMembers) return [];
    
    return Object.entries(partyMembers)
      .map(([userId, member]) => ({
        userId,
        displayName: member.displayName,
        damage: member.currentBossDamage || 0,
        level: member.level,
        avatar: member.avatar
      }))
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10);
  }, [partyMembers]);

  const maxDamage = Math.max(...topContributors.map(c => c.damage));
  const healthPercentage = (bossHealth / bossMaxHealth) * 100;

  return (
    <div className="border border-slate-700 rounded-lg p-3 md:p-4 lg:p-6 bg-slate-900/60">
      {/* Boss Display - Horizontal on mobile/tablet, Vertical on desktop */}
      <div className="flex lg:flex-col items-center lg:items-center gap-3 md:gap-4 lg:gap-2">
        
        {/* Boss Avatar - Small on mobile, medium on tablet, large on desktop */}
        <div className="relative flex-shrink-0">
          <div className={`w-16 h-16 md:w-24 md:h-24 lg:w-40 lg:h-40 rounded-lg bg-slate-900 border-2 ${difficultyStyle.border} overflow-hidden`}>
            <img 
              src={bossImage} 
              alt={bossName}
              className="w-full h-full object-contain"
              onError={(e) => {
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
          
          {/* Difficulty Badge */}
          <div className={`absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 lg:-top-2 lg:-right-2 ${difficultyStyle.badge} text-white text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-slate-600 uppercase`}>
            {bossDifficulty}
          </div>
        </div>
  
        {/* Boss Info - Flex-1 on mobile/tablet to take remaining space */}
        <div className="flex-1 lg:flex-none lg:w-full">
          {/* Boss Name */}
          <div className="flex items-center gap-2 mb-1 lg:justify-center">
            <span className={`text-sm md:text-base lg:text-lg font-bold truncate ${difficultyStyle.text}`}>
              {bossName}
            </span>
          </div>
  
          {/* Health Bar */}
          <div className="w-full lg:max-w-xs lg:mx-auto">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs md:text-sm text-slate-400">HP</span>
              <span className="text-xs md:text-sm text-slate-300">
                {bossHealth} / {bossMaxHealth}
              </span>
            </div>
            <div className="w-full bg-slate-800 lg:bg-slate-900 rounded-full h-2 md:h-2.5 lg:h-3 border border-slate-700">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  healthPercentage > 60 ? 'bg-red-500' : 
                  healthPercentage > 30 ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${healthPercentage}%` }}
              ></div>
            </div>
            <div className="text-center mt-1">
              <span className="text-[10px] md:text-xs text-slate-400">
                {Math.round(healthPercentage)}% remaining
              </span>
            </div>
          </div>
        </div>
      </div>
  
      {/* Top Contributors - Collapsible on mobile/tablet, always visible on desktop */}
      <div className="bg-slate-900 p-2 md:p-3 border border-slate-900 rounded-lg mt-3 md:mt-4">
        {/* Collapse button - only on mobile/tablet */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden w-full flex items-center justify-between text-xs md:text-sm text-slate-400 hover:text-slate-300"
        >
          <span>Top Contributors</span>
          <span>{isExpanded ? '▲' : '▼'}</span>
        </button>
  
        {/* Desktop header - always visible */}
        <div className="hidden lg:flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Top Contributors</span>
          <span className="text-xs text-slate-500">This battle</span>
        </div>
  
        {/* Leaderboard content - collapsed on mobile/tablet unless expanded */}
        <div className={`${!isExpanded ? 'hidden lg:block' : 'block'} space-y-1 max-h-40 md:max-h-48 lg:max-h-[200px] overflow-y-auto mt-2`}>
          {topContributors.length > 0 ? (
            topContributors.slice(0, collapsible ? 5 : 10).map((contributor, index) => {
              const percentage = (contributor.damage / maxDamage) * 100;
              
              return (
                <div key={contributor.userId} className="relative">
                  <div className="w-full bg-slate-800 rounded h-6 md:h-7 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        index === 0 ? 'bg-yellow-500/40' :
                        index === 1 ? 'bg-slate-400/40' :
                        index === 2 ? 'bg-amber-600/40' :
                        'bg-slate-600/40'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    <div className="flex items-center space-x-2">
                      <span className={index < 3 ? 'text-xs md:text-sm' : 'text-slate-500 text-[10px] md:text-xs'}>
                        {getMedal(index) || `${index + 1}`}
                      </span>
                      <span className={`text-[10px] md:text-xs font-medium truncate max-w-[80px] md:max-w-[100px] lg:max-w-[120px] 
                        ${contributor.userId === user?.uid ? "text-blue-400" : "text-slate-200"}
                      `}>
                        {contributor.displayName}
                        {contributor.userId === user?.uid && " (you)"}
                      </span>
                    </div>
                    <span className="text-red-400 font-bold text-[10px] md:text-xs">
                      {contributor.damage}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs md:text-sm text-slate-500 text-center py-2">
              No damage dealt yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CurrentBossFight;