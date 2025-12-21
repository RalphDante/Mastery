import { useState } from "react";
import { Zap, Clock, Flame, Crown } from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";
import { activateBooster } from "../../utils/boosterService";

export default function BoostersSection() {
  const { userProfile, refreshUserProfile, user } = useAuthContext();
  const [activatingBooster, setActivatingBooster] = useState(null);

  const userProf = userProfile;
  const savedBoosters = userProf?.savedBoosters || [];

  // Filter out expired boosters
  const validBoosters = savedBoosters.filter(booster => {
    const expiresAt = booster.expiresAt?.toMillis?.() || booster.expiresAt;
    return expiresAt > Date.now();
  });

  // Check if userProf has an active booster
  const activeBooster = userProf?.activeBooster;
  const hasActiveBooster = activeBooster && activeBooster.endsAt > Date.now();

  const handleActivateBooster = async (booster) => {
    if (hasActiveBooster) {
      alert("You already have an active booster! Wait for it to expire first.");
      return;
    }

    // Find the ORIGINAL index in savedBoosters (not validBoosters)
    const originalIndex = savedBoosters.findIndex(b => 
      b.savedAt?.toMillis?.() === booster.savedAt?.toMillis?.()
    );

    if (originalIndex === -1) {
      alert("Booster not found!");
      return;
    }

    setActivatingBooster(originalIndex);
    
    try {
      await activateBooster(user?.uid, booster, originalIndex);
      
      // Refresh userProf profile to show active booster
      await refreshUserProfile();
      
      alert(`${booster.multiplier}x XP Booster activated for ${booster.duration} minutes!`);
    } catch (error) {
      console.error("Failed to activate booster:", error);
      alert(error.message || "Failed to activate booster. Please try again.");
    } finally {
      setActivatingBooster(null);
    }
  };


  const getBoosterIcon = (multiplier) => {
    if (multiplier >= 3) return <Flame className="w-8 h-8" />;
    return <Zap className="w-8 h-8" />;
  };

  const getBoosterColor = (multiplier) => {
    if (multiplier >= 3) return {
      border: 'border-orange-500',
      bg: 'bg-orange-500/10',
      shadow: 'shadow-orange-500/30',
      text: 'text-orange-400',
      gradient: 'from-orange-500 to-red-500',
      ring: 'ring-orange-500/30'
    };
    return {
      border: 'border-purple-500',
      bg: 'bg-purple-500/10',
      shadow: 'shadow-purple-500/30',
      text: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-500',
      ring: 'ring-purple-500/30'
    };
  };

  const formatTimeRemaining = (expiresAt) => {
    const timestamp = expiresAt?.toMillis?.() || expiresAt;
    const hoursLeft = Math.floor((timestamp - Date.now()) / (1000 * 60 * 60));
    if (hoursLeft < 1) return "< 1 hour";
    if (hoursLeft === 1) return "1 hour";
    return `${hoursLeft} hours`;
  };

  return (
    <div className="space-y-6">
      {/* Active Booster Display */}
      {hasActiveBooster && (
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border-2 border-purple-500 shadow-lg shadow-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">
                  {activeBooster.multiplier}x XP Boost Active!
                </p>
                <div className="flex items-center gap-2 text-slate-300 text-sm mt-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {Math.floor((activeBooster.endsAt - Date.now()) / 60000)} minutes remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Boosters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-slate-300">
            Your Boosters ({validBoosters.length}/3)
          </label>
          {validBoosters.length === 0 && (
            <p className="text-slate-500 text-sm">Complete sessions to earn boosters</p>
          )}
        </div>

        {validBoosters.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700">
            <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-2">No Boosters Available</p>
            <p className="text-slate-500 text-sm">
              Complete focus sessions to earn XP boosters from bonus loot!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {validBoosters.map((booster, index) => {
              const colors = getBoosterColor(booster.multiplier);
              
              // Find original index for activation tracking
              const originalIndex = savedBoosters.findIndex(b => 
                b.savedAt?.toMillis?.() === booster.savedAt?.toMillis?.()
              );
              const isActivating = activatingBooster === originalIndex;

              return (
                <div
                  key={`${booster.savedAt?.toMillis?.()}-${index}`}
                  className={`
                    relative rounded-xl border-2 transition-all duration-300 overflow-hidden
                    ${colors.border} ${colors.bg} shadow-lg ${colors.shadow}
                  `}
                >
                  {/* Gradient Background */}
                  <div 
                    className={`absolute inset-0 opacity-10 bg-gradient-to-br ${colors.gradient}`}
                  />

                  <div className="relative p-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${colors.shadow}`}>
                      {getBoosterIcon(booster.multiplier)}
                    </div>

                    {/* Title */}
                    <h3 className={`text-2xl font-bold text-center mb-2 ${colors.text}`}>
                      {booster.multiplier}x XP Boost
                    </h3>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-center gap-2 text-slate-300 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {booster.duration} minutes</span>
                      </div>
                      <div className="text-center text-slate-400 text-xs">
                        Expires in {formatTimeRemaining(booster.expiresAt)}
                      </div>
                    </div>

                    {/* Activate Button */}
                    <button
                      onClick={() => handleActivateBooster(booster)}
                      disabled={isActivating || hasActiveBooster}
                      className={`
                        w-full py-3 rounded-lg font-semibold transition-all
                        ${hasActiveBooster
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : `bg-gradient-to-r ${colors.gradient} hover:shadow-xl ${colors.shadow} text-white`
                        }
                      `}
                    >
                      {isActivating ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Activating...
                        </span>
                      ) : hasActiveBooster ? (
                        "Booster Active"
                      ) : (
                        "Activate Now"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            <p className="font-medium text-white">How Boosters Work</p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 text-xs">
              <li>Activate before starting a focus session</li>
              <li>Earn bonus XP multiplied by the booster amount</li>
              <li>Only one booster can be active at a time</li>
              <li>Max 3 saved boosters - extras convert to XP</li>
              <li>Boosters expire after 48 hours if not used</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}