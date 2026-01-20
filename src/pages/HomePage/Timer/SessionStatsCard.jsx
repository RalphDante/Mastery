import { Trophy } from 'lucide-react';
import { usePartyContext } from '../../../contexts/PartyContext';
import { useEffect, useState } from 'react';
import Boss from '../Boss/Boss';

function SessionStatsCard({ 
  rewards, 
  selectedDuration, 
  isPro, 
  hasActiveBooster,
  onProClick,
  predictedStats
}) {
  const {partyProfile} = usePartyContext();

  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth );


  useEffect(() => {
    // Check on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    
    // Update on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ONLY render one or the other
  if (isMobile) {
    return (
      <Boss 
        collapsible={true}
      />
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg w-full max-w-xs">
      {/* Pro Banner at top */}
      {!isPro && !hasActiveBooster && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/30 px-3 py-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-300 text-xs">
              Feeling competitive?{' '}
              <button 
                onClick={onProClick}
                className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-dotted"
              >
                Try Pro
              </button>
            </span>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-0.5">
            2x XP · Climb faster
          </p>
        </div>
      )}
      
      
        <div className=" p-3 w-full max-w-xs">
          <p className="text-slate-400 text-xs text-center mb-2">Current Progress:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-yellow-400 font-bold">+{predictedStats.exp} XP</div>
              <div className="text-slate-500">Earned</div>
            </div>
            <div className="text-center">
              {partyProfile?.currentBoss?.isAlive ? (
                <>
                  <div className="text-orange-400 font-bold">{predictedStats.damage} DMG</div>
                  <div className="text-slate-500">Dealt</div>
                </>
              ) : (
                <>
                  <div className="text-orange-400 font-bold">0 DMG</div>
                  <div className="text-slate-500">Boss Defeated</div>
                </>
              )}
            
            </div>
            <div className="text-center">
              <div className="text-red-400 font-bold">+{predictedStats.health} HP</div>
              <div className="text-slate-500">Restored</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-bold">+{predictedStats.mana} MP</div>
              <div className="text-slate-500">Restored</div>
            </div>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2 italic">
            Updates saved when timer completes
          </p>
        </div>
    </div>
  );
}

export default SessionStatsCard;