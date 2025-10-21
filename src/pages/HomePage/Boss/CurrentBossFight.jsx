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

function CurrentBossFight() {
  const {partyProfile, partyMembers} = usePartyContext();
  const {user} = useAuthContext();

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
    <div>
      {/* Header */}
      <div className="text-left">
        <h2 className="text-xl font-semibold mb-1 text-slate-100">Party Boss</h2>
      </div>

      {/* Boss Display */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-2">
        {/* Boss Avatar */}
        <div className="relative">
          <div className={`w-40 h-40 rounded-lg bg-slate-900 border-2 ${difficultyStyle.border} overflow-hidden`}>
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
          <div className={`absolute -top-2 -right-2 ${difficultyStyle.badge} text-white text-xs font-semibold px-2 py-1 rounded-full border border-slate-600 uppercase`}>
            {bossDifficulty}
          </div>
        </div>

        {/* Boss Name */}
        <span className={`text-lg font-bold ${difficultyStyle.text}`}>
          {bossName}
        </span>

        {/* Health Bar */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">HP</span>
            <span className="text-sm text-slate-300">
              {bossHealth} / {bossMaxHealth}
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

      {/* Top Contributors */}
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg min-h-[200px]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Top Contributors</span>
          <span className="text-xs text-slate-500">This battle</span>
        </div>
        <div className="space-y-1 h-full overflow-y-auto">
          {topContributors.length > 0 ? (
            topContributors.map((contributor, index) => {
              const percentage = (contributor.damage / maxDamage) * 100;
              
              return (
                <div key={contributor.userId} className="relative">
                  <div className="w-full bg-slate-800 rounded h-7 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        index === 0 ? 'bg-yellow-500/30' :
                        index === 1 ? 'bg-slate-400/30' :
                        index === 2 ? 'bg-amber-600/30' :
                        'bg-slate-600/20'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    <div className="flex items-center space-x-2">
                      <span className={index < 3 ? 'text-sm' : 'text-slate-500 text-xs'}>
                        {getMedal(index) || `${index + 1}`}
                      </span>
                      <span className={`text-xs font-medium truncate max-w-[120px] 
                        ${contributor.userId === user?.uid ? "text-blue-400" : "text-slate-200"}
                      `}>
                        {contributor.displayName}
                        {contributor.userId === user?.uid && " (you)"}
                      </span>
                    </div>
                    <span className="text-red-400 font-bold text-xs">
                      {contributor.damage}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 text-center py-2">
              No damage dealt yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CurrentBossFight;