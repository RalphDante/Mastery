import { createPortal } from "react-dom";
import { Crown, Trophy, Swords, Users } from "lucide-react";
import { usePartyContext } from "../../contexts/PartyContext";
import { bosses } from "../../utils/bossUtils";

function NewUserBattleModal({ onStartSession, onClose }) {
    const{partyProfile} = usePartyContext();

    const bossNumber = partyProfile?.currentBoss.bossNumber;
    const bossHealth = partyProfile?.currentBoss.currentHealth;
    const bossMaxHealth = partyProfile?.currentBoss.maxHealth;
    const bossIsAlive = partyProfile?.currentBoss.isAlive;
    const partySize = partyProfile?.memberCount;
  
    const currentBoss = bosses.find(b => b.bossNumber === bossNumber);
    const bossImage = currentBoss?.image;
    const bossName = currentBoss?.name;
    
    const healthPercentage = (bossHealth / bossMaxHealth) * 100;
  
    // Determine the modal variant
    const isNewParty = partySize === 1;
    const isBossDefeated = partySize > 1 && !bossIsAlive;
    const isBattleActive = bossIsAlive;
  
    if (!partyProfile) {
      return null;
    }
  
    // Dynamic content based on state
    const getHeaderContent = () => {
      if (isNewParty) {
        return {
          icon: <Crown className="w-12 h-12 text-white" strokeWidth={2.5} />,
          title: "You're the Party Leader!",
          subtitle: "A new boss has spawned",
          gradient: "from-purple-600 via-purple-700 to-indigo-600"
        };
      }
      
      if (isBossDefeated) {
        return {
          icon: <Trophy className="w-12 h-12 text-white" strokeWidth={2.5} />,
          title: "Your Party Just Won!",
          subtitle: "A new boss spawns soon",
          gradient: "from-green-600 via-emerald-700 to-teal-600"
        };
      }
      
      return {
        icon: <Swords className="w-12 h-12 text-white" strokeWidth={2.5} />,
        title: "Battle in Progress!",
        subtitle: "Your party needs you right now",
        gradient: "from-red-600 via-red-700 to-orange-600"
      };
    };
  
    const getPartyStatus = () => {
      if (isNewParty) {
        return (
          <div className="flex items-center justify-center gap-2 text-slate-300 text-sm bg-slate-900/50 py-2 px-3 rounded-lg border border-purple-700">
            <Users className="w-4 h-4 text-purple-400" />
            <span>More warriors joining your party soon</span>
          </div>
        );
      }
      
      return (
        <div className="flex items-center justify-center gap-2 text-slate-300 text-sm bg-slate-900/50 py-2 px-3 rounded-lg border border-slate-700">
          <Users className="w-4 h-4 text-blue-400" />
          <span><span className="font-bold text-blue-400">{partySize}</span> members {isBossDefeated ? 'ready' : 'fighting'}</span>
        </div>
      );
    };
  
    const getButtonText = () => {
      if (isNewParty) {
        return (
          <>
            <Crown className="w-5 h-5" />
            Start 1min & Lead the Charge
          </>
        );
      }
      
      if (isBossDefeated) {
        return (
          <>
            <Swords className="w-5 h-5" />
            Start 1min Session
          </>
        );
      }
      
      return (
        <>
          <Swords className="w-5 h-5" />
          Start 1min & Join Battle
        </>
      );
    };
  
    const getExplainerText = () => {
      if (isNewParty) {
        return "Lead by example - deal the first damage";
      }
      
      if (isBossDefeated) {
        return "Keep studying to be ready for the next boss";
      }
      
      return "Study to deal damage • Earn XP & rewards";
    };
  
    const headerContent = getHeaderContent();
  
    return createPortal(
      <>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-0 relative shadow-2xl animate-scale-in overflow-hidden border-2 border-red-500/50">
            
            {/* Header Section - Dynamic gradient based on state */}
            <div className={`bg-gradient-to-br ${headerContent.gradient} p-8 text-center relative overflow-hidden`}>
              {/* Animated background elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl -translate-x-20 -translate-y-20 animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-yellow-300 rounded-full blur-3xl translate-x-20 translate-y-20 animate-pulse delay-150"></div>
              </div>
  
              {/* Dynamic Icon */}
              <div className="relative z-10 mb-3 flex justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  {headerContent.icon}
                </div>
              </div>
  
              <h2 className="text-3xl font-bold text-white mb-2 relative z-10 drop-shadow-lg">
                {headerContent.title}
              </h2>
              <p className="text-white/95 text-base font-medium relative z-10">
                {headerContent.subtitle}
              </p>
            </div>
  
            {/* Content Section */}
            <div className="p-6 space-y-4 bg-slate-800">
              
              {/* Boss Display */}
              <div className={`flex flex-col items-center gap-3 bg-slate-900 rounded-xl p-4 ${
                isBossDefeated ? 'border border-green-500/30 opacity-60' : 'border border-red-500/30'
              }`}>
                <div className="relative">
                  <img 
                    src={bossImage} 
                    alt={bossName}
                    className={`w-28 h-28 object-contain ${isBossDefeated ? 'grayscale' : ''}`}
                  />
                  {isBossDefeated && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-green-400 font-bold text-2xl rotate-[-15deg] drop-shadow-lg">
                        DEFEATED
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center w-full">
                  <div className={`font-bold text-xl mb-2 ${isBossDefeated ? 'text-slate-500 line-through' : 'text-red-400'}`}>
                    {bossName}
                  </div>
                  
                  {/* Health Bar - only show if boss is alive */}
                  {bossIsAlive && (
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">HP</span>
                        <span className="text-xs text-slate-300">
                          {bossHealth.toLocaleString()} / {bossMaxHealth.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-700">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            healthPercentage > 60 ? 'bg-red-500' : 
                            healthPercentage > 30 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${healthPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
  
              {/* Party Status - Dynamic */}
              {getPartyStatus()}
  
              {/* CTA Button - THE BIG ONE */}
              <button
                onClick={onStartSession}
                className={`w-full bg-gradient-to-r ${
                  isNewParty 
                    ? 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-purple-400/50 shadow-purple-500/30' 
                    : isBossDefeated
                    ? 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-green-400/50 shadow-green-500/30'
                    : 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 border-red-400/50 shadow-red-500/30'
                }
                          text-white font-bold py-4 px-6 rounded-xl 
                          transition-all hover:scale-[1.02] shadow-lg
                          border-2
                          text-lg relative overflow-hidden group`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {getButtonText()}
                </span>
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
  
              {/* Quick explainer - super short */}
              <p className="text-center text-xs text-slate-400">
                {getExplainerText()}
              </p>
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes scale-in {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .animate-scale-in {
            animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
  
          .delay-150 {
            animation-delay: 150ms;
          }
        `}</style>
      </>,
      document.body
    );
  }

export default NewUserBattleModal;