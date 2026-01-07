// components/SessionCompleteScreen.jsx
import React, { useState } from 'react';
import { getSessionRewards } from '../../../configs/rewardsConfig';
import LootRevealModal from '../../../components/Modals/LootRevealModal';
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SessionCompleteScreen({ 
  selectedDuration, 
  rewards, 
  onReset,
  userProfile,
  userId,
  hasNotStartedATimerSession,
  onUpgrade // NEW: Add this prop
}) {

  const navigate = useNavigate();

  let numRolls = 0;
  const durationMinutes = selectedDuration;
  if (durationMinutes >= 60) numRolls = 2;
  else if (durationMinutes >= 45) numRolls = 2;
  else if (durationMinutes >= 25) numRolls = 1;
  else if (durationMinutes >= 15) numRolls = 1;

  if (hasNotStartedATimerSession && numRolls === 0) {
    numRolls = 1;
  }

  const shouldShowModal = hasNotStartedATimerSession || numRolls > 0;
  
  const [showLootRevealModal, setShowLootRevealModal] = useState(shouldShowModal);

  const user = userProfile;
  const isPro = user?.subscription?.tier === "pro";

  // Calculate what they COULD have earned with Pro
  const proRewards = {
    xp: rewards.xp * 2,
    health: rewards.health,
    mana: rewards.mana,
    damage: rewards.damage
  };

  const missedXP = proRewards.xp - rewards.xp;

  return (
    <>
      {showLootRevealModal && (
        <LootRevealModal 
          numRolls={numRolls}
          userCollection={user}
          isPro={isPro}
          onClose={()=>setShowLootRevealModal(false)}
          userId={userId}
          isFirstTimer={hasNotStartedATimerSession}
        />
      )}
      <div className="text-center flex-1 flex flex-col justify-center items-center space-y-1">
        <div>
          <img 
            src="/images/sword-x.png"
            alt="sword-x image"
            className="w-24 h-24 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-green-400">Session Complete!</h2>
        <p className="text-slate-300">
          Great work on your {selectedDuration} minute session
        </p>
        
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg w-full max-w-xs">
          <p className="text-sm text-slate-400 mb-3">Rewards Earned:</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Experience</span>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold">+{!isPro ? rewards.xp : proRewards.xp} XP</span>
                {!isPro && (
                  <span className="text-xs text-slate-500 line-through">
                    {proRewards.xp}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Health</span>
              <span className="text-red-500 font-bold">+{rewards.health} HP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Mana</span>
              <span className="text-blue-500 font-bold">+{rewards.mana} MANA</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Boss Damage</span>
              <span className="text-red-400 font-bold">{rewards.damage} DMG</span>
            </div>
          </div>

          {/* Pro Upsell - Only show if not Pro */}
          {!isPro && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-300 text-xs">
                  <button 
                    onClick={()=>{navigate('/pricing')}}
                    className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-dotted"
                  >
                    Pro Members
                  </button>{' '}earn double XP
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={onReset} 
        className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-lg"
      >
        Start A New Session
      </button>
    </>
  );
}