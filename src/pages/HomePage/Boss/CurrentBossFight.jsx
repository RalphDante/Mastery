import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { bosses } from '../../../utils/bossUtils';
import BossVictoryScreen from './BossVictoryScreen';

function CurrentBossFight() {
  // Mock data - replace with real data from your backend
  const {partyProfile, partyMembers} = useAuthContext();
  const [bossData, setBossData] = useState({
    name: "Crimson Drake",
    currentHP: 2450,
    maxHP: 5000,
    level: 12,
    timeLeft: "2h 34m"
  });

  const bossNumber = partyProfile?.currentBoss.bossNumber;
  const bossHealth = partyProfile?.currentBoss.currentHealth;
  const bossMaxHealth = partyProfile?.currentBoss.maxHealth;

  const bossImage = bosses.find(b => b.bossNumber === bossNumber)?.image

  // const partyMembersContext = partyMembers?



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
      .sort((a, b) => b.damage - a.damage) // Sort by damage (highest first)
      .slice(0, 10); // Get top 10
  }, [partyMembers]);


  const healthPercentage = (bossHealth / bossMaxHealth) * 100;
  const isDamaged = healthPercentage < 100;

  return (
     
      <div>
        
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
              src={bossImage} 
              alt={partyProfile?.currentBoss?.name}
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

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Top Contributors</span>
          <span className="text-xs text-slate-500">This battle</span>
        </div>
        <div className="space-y-1 max-h-20 overflow-y-auto">
          {topContributors.length > 0 ? (
            topContributors.map((contributor, index) => {
              const getMedal = (position) => {
                if (position === 0) return <span className="text-yellow-400">🥇</span>;
                if (position === 1) return <span className="text-slate-400">🥈</span>;
                if (position === 2) return <span className="text-amber-600">🥉</span>;
                return <span className="text-slate-500">{position + 1}</span>;
              };

              return (
                <div key={contributor.userId} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    {getMedal(index)}
                    <span className="text-slate-300">{contributor.displayName}</span>
                  </div>
                  <span className="text-red-400 font-medium">{contributor.damage} DMG</span>
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

export default CurrentBossFight;