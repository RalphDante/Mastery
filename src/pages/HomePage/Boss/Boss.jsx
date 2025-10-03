import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { bosses } from '../../../utils/bossUtils';
import BossVictoryScreen from './BossVictoryScreen';
import CurrentBossFight from './currentBossFight';

function Boss() {
  // Mock data - replace with real data from your backend
  const {partyProfile, partyMembers} = useAuthContext();

  if (!partyProfile || partyProfile.currentBoss === undefined) {
    return (
      <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-center items-center text-slate-100">
        <span className="text-slate-400">Loading boss...</span>
      </div>
    );
  }

  const bossStatus = partyProfile.currentBoss.isAlive;
  
  // const bossStatus = true;


  return (
    <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      
      {bossStatus ? 
        <CurrentBossFight /> : 
        <BossVictoryScreen />
        }
      
    </div>
  );
}

export default Boss;