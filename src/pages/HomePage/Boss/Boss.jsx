import React, { useState, useEffect } from 'react';
import { bosses } from '../../../utils/bossUtils';
import BossVictoryScreen from './BossVictoryScreen';
import CurrentBossFight from './currentBossFight';
import { usePartyContext } from '../../../contexts/PartyContext';
import { useTutorials } from '../../../contexts/TutorialContext';
import { ArrowLeft } from 'lucide-react';

function Boss() {
  // Mock data - replace with real data from your backend
  const {partyProfile, partyMembers} = usePartyContext();

  const {isTutorialAtStep} = useTutorials();
  const hasNotStartedATimerSession = isTutorialAtStep('start-timer', 1);
  const hasNotStartedAFlashcardSession = isTutorialAtStep('create-deck', 1);
  const hasNotStartedASession = hasNotStartedAFlashcardSession && hasNotStartedATimerSession;

  if (!partyProfile || partyProfile.currentBoss === undefined) {
    return (
      <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-center items-center text-slate-100">
        <span className="text-slate-400">Loading boss...</span>
      </div>
    );
  }

  const bossStatus = partyProfile.currentBoss.isAlive;
  


  return (
    <>
      {hasNotStartedASession ? (
        <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-7xl mb-4 opacity-50 grayscale">👾</div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-200 mb-3">
              Unlock Boss Battles
            </h3>
            <p className="text-slate-400 mb-4 max-w-sm">
              Start a study session to start fighting bosses with your party!
            </p>
            <div className="inline-flex items-center space-x-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full text-sm font-semibold">
              
              <span>← Start your first session</span>
              <span>⚔️</span>

            </div>
          </div>
        </div>
      ) : (
         <div className="w-full bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      
          {bossStatus ? 
            <CurrentBossFight /> : 
            <BossVictoryScreen />
            }
          
        </div>
      )}
    </>
   
  );
}

export default Boss;